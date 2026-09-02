<?php

namespace App\Services\Edt;

use App\Models\Classe;
use App\Models\EnseignantIndisponibilite;
use App\Models\GroupePedagogique;
use App\Models\NiveauMatiere;
use App\Models\PlageHoraire;
use App\Models\Salle;
use App\Models\VolumeHoraire;
use Illuminate\Support\Facades\DB;

/**
 * Générateur d'emploi du temps — chantier EDT (Lots 2 à 4).
 *
 * Heuristique 100 % PHP : construction gloutonne (les séances les plus
 * contraintes d'abord) puis amélioration locale. Le moteur est isolé derrière
 * cette classe : il pourra être remplacé par un solveur externe (OR-Tools) sans
 * toucher au reste (job, persistance, UI).
 *
 * Un « besoin » = une séance à placer. Il porte un ou plusieurs « sous-cours » :
 * un seul dans le cas général, plusieurs quand la classe se scinde en groupes
 * parallèles (LV2, dédoublement — Lot 4). Chaque sous-cours produit un créneau,
 * tous au même jour/plage/semaine.
 *
 * Ne touche pas la base : `generer()` renvoie une proposition, la persistance
 * est faite par l'appelant.
 */
class Generateur
{
    private const JOURS_DEFAUT = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

    private const HEURE_CHAUDE_DEBUT = '10:00';

    private const HEURE_CHAUDE_FIN = '16:00';

    private const FAMILLES_2H_OK = ['francais', 'maths', 'philo', 'pc'];

    /** @var string[] */
    private array $jours;

    /** plagesJour[jour] = [plage, ...] ordonnées (type cours). */
    private array $plagesJour = [];

    private int $dureePlageMediane = 55;

    /** occ[type][id][jour][plage_id] = [ ['besoin'=>id, 'semaine'=>s], ... ] */
    private array $occClasse = [];

    private array $occProf = [];

    private array $occSalle = [];

    /** indispo[prof_id][jour] = [ ['debut'=>, 'fin'=>], ... ] (bloquantes) */
    private array $indispos = [];

    /** salles disponibles par type, + salles « classe » banalisées */
    private array $sallesParType = [];

    private array $sallesBanalisees = [];

    private array $besoins = [];

    private array $placements = [];      // besoin_id => ['jour','plages','heure_debut','heure_fin','salles'=>[]]

    /** @var int[] besoin_id des créneaux verrouillés (ne bougent pas) */
    private array $fixes = [];

    private array $diagnostic = [];

    /**
     * Génère une proposition d'emploi du temps.
     *
     * $params : jours (string[]), classe_ids (int[]), creneaux_fixes (array de
     * créneaux verrouillés à conserver tels quels — régénération partielle).
     *
     * @return array{creneaux:array, score:int, diagnostic:array}
     */
    public function generer(array $params = []): array
    {
        $this->jours = $params['jours'] ?? self::JOURS_DEFAUT;
        $this->diagnostic = ['non_affectees' => [], 'sans_seances' => [], 'non_placees' => []];

        $this->chargerGrille();
        $this->chargerSalles();
        $this->chargerIndispos();
        $this->construireBesoins($params['classe_ids'] ?? null);
        $this->preplacerFixes($params['creneaux_fixes'] ?? []);

        if (empty($this->besoins)) {
            return ['creneaux' => [], 'score' => 0, 'diagnostic' => $this->diagnostic + $this->stats(0)];
        }

        $this->trierBesoins();
        $this->placementGlouton();
        $this->ameliorationLocale();

        return [
            'creneaux' => $this->creneauxProduits(),
            'score' => $this->score(),
            'diagnostic' => $this->diagnostic + $this->stats(count($this->placements)),
        ];
    }

    // ── Chargement ─────────────────────────────────────────────────────────

    private function chargerGrille(): void
    {
        $plages = PlageHoraire::actives()->cours()->orderBy('heure_debut')->get();
        foreach ($this->jours as $jour) {
            $this->plagesJour[$jour] = $plages
                ->filter(fn ($p) => $p->jour === $jour || $p->jour === null)
                ->sortBy(fn ($p) => substr($p->heure_debut, 0, 5))
                ->values()
                ->all();
        }
        $durees = $plages->map(fn ($p) => (strtotime($p->heure_fin) - strtotime($p->heure_debut)) / 60)->sort()->values();
        if ($durees->isNotEmpty()) {
            $this->dureePlageMediane = (int) $durees[(int) floor($durees->count() / 2)];
        }
    }

    private function chargerSalles(): void
    {
        foreach (Salle::actives()->get() as $s) {
            if (in_array($s->type, ['labo', 'salle_info', 'gymnase'], true)) {
                $this->sallesParType[$s->type][] = $s->id;
            } else {
                $this->sallesBanalisees[] = $s->id;
            }
        }
    }

    private function chargerIndispos(): void
    {
        foreach (EnseignantIndisponibilite::where('type', 'bloquant')->get() as $i) {
            $debut = $i->heure_debut ? substr($i->heure_debut, 0, 5) : '00:00';
            $fin = $i->heure_fin ? substr($i->heure_fin, 0, 5) : '23:59';
            if ($i->plage_horaire_id) {
                $p = PlageHoraire::find($i->plage_horaire_id);
                if ($p) {
                    $debut = substr($p->heure_debut, 0, 5);
                    $fin = substr($p->heure_fin, 0, 5);
                }
            }
            $this->indispos[$i->enseignant_id][$i->jour][] = ['debut' => $debut, 'fin' => $fin];
        }
    }

    private function construireBesoins(?array $classeIds): void
    {
        $classes = Classe::with('niveau')
            ->when($classeIds, fn ($q) => $q->whereIn('id', $classeIds))
            ->get();

        $affectations = DB::table('classe_enseignant_matiere')->get()
            ->groupBy(fn ($r) => $r->classe_id.'_'.$r->matiere_id)
            ->map(fn ($g) => $g->pluck('enseignant_id')->all());

        $groupesParClasse = GroupePedagogique::with('matiere')->get()->groupBy('classe_id');

        $seq = 0;
        foreach ($classes as $classe) {
            // 1) Blocs de groupes parallèles (LV2, dédoublements)
            $matieresEnGroupe = [];
            foreach (($groupesParClasse[$classe->id] ?? collect())->groupBy('parallele_code') as $code => $groupes) {
                $matieresEnGroupe = array_merge($matieresEnGroupe, $groupes->pluck('matiere_id')->all());
                $nb = (int) ($groupes->max('nb_seances') ?: $this->heuresProgramme($classe, $groupes->first()->matiere_id) ?: 2);
                $duree = (int) $groupes->max('duree_minutes') ?: 55;
                for ($k = 0; $k < $nb; $k++) {
                    $this->besoins[$seq] = $this->besoin($seq, $classe, $duree, 'toutes', $groupes->map(fn ($g) => [
                        'matiere_id' => $g->matiere_id,
                        'matiere' => $g->matiere?->libelle_matiere ?? $g->libelle,
                        'enseignant_id' => $g->enseignant_id,
                        'salle_type' => $g->matiere?->salle_type_requis,
                        'famille' => $g->matiere?->famille,
                        'effort' => (bool) ($g->matiere?->effort_soutenu),
                        'groupe_id' => $g->id,
                    ])->all());
                    $seq++;
                }
            }

            // 2) Programme normal
            $programme = NiveauMatiere::with(['matiere', 'seancesTypes'])
                ->where('niveau_id', $classe->niveau_id)
                ->where(fn ($q) => $q->whereNull('serie_id')->orWhere('serie_id', $classe->serie_id))
                ->get();
            $volumes = VolumeHoraire::where('niveau_id', $classe->niveau_id)->pluck('heures_semaine', 'matiere_id');
            $quinzaineIdx = 0; // alterne A/B au niveau de la classe (ex. PC en A, SVT en B)

            foreach ($programme as $nm) {
                $matiere = $nm->matiere;
                if (! $matiere || in_array($matiere->id, $matieresEnGroupe, true) || $nm->groupe_alternatif_id) {
                    continue; // matière prise en charge par un groupe (ou matière « alternative »)
                }
                $profs = $affectations->get($classe->id.'_'.$matiere->id, []);
                if (empty($profs)) {
                    $this->diagnostic['non_affectees'][] = "{$classe->nom_classe} · {$matiere->libelle_matiere}";

                    continue;
                }

                $seances = $nm->seancesTypes->all();
                if (empty($seances)) {
                    $heures = (int) round((float) ($volumes[$matiere->id] ?? 0));
                    if ($heures < 1) {
                        continue;
                    }
                    $this->diagnostic['sans_seances'][] = "{$classe->nom_classe} · {$matiere->libelle_matiere}";
                    $seances = array_fill(0, $heures, (object) ['duree_minutes' => 55, 'nb_seances' => 1, 'frequence' => 'hebdomadaire']);
                }

                foreach ($seances as $s) {
                    $duree = (int) ($s->duree_minutes ?? 55);
                    for ($k = 0; $k < (int) ($s->nb_seances ?? 1); $k++) {
                        $quinzaine = ($s->frequence ?? 'hebdomadaire') === 'quinzaine';
                        $semaine = $quinzaine ? ($quinzaineIdx++ % 2 === 0 ? 'A' : 'B') : 'toutes';
                        $this->besoins[$seq] = $this->besoin($seq, $classe, $duree, $semaine, [[
                            'matiere_id' => $matiere->id,
                            'matiere' => $matiere->libelle_matiere,
                            'enseignant_id' => $profs[$seq % count($profs)],
                            'salle_type' => $matiere->salle_type_requis,
                            'famille' => $matiere->famille,
                            'effort' => (bool) $matiere->effort_soutenu,
                            'groupe_id' => null,
                        ]]);
                        $seq++;
                    }
                }
            }
        }
    }

    private function besoin(int $id, Classe $classe, int $dureeMinutes, string $semaine, array $sousCours): array
    {
        $primaire = $sousCours[0];

        return [
            'id' => $id,
            'classe_id' => $classe->id,
            'niveau_ordre' => $classe->niveau?->ordre,
            'nb_plages' => max(1, (int) round($dureeMinutes / max(30, $this->dureePlageMediane))),
            'semaine' => $semaine,
            'sous_cours' => $sousCours,
            // champs « représentatifs » pour le scoring (= sous-cours principal)
            'matiere_id' => $primaire['matiere_id'],
            'matiere' => $primaire['matiere'],
            'enseignant_id' => $primaire['enseignant_id'],
            'salle_type' => $primaire['salle_type'],
            'famille' => $primaire['famille'],
            'effort' => $primaire['effort'],
        ];
    }

    private function heuresProgramme(Classe $classe, ?int $matiereId): int
    {
        if (! $matiereId) {
            return 0;
        }

        return (int) round((float) VolumeHoraire::where('niveau_id', $classe->niveau_id)
            ->where('matiere_id', $matiereId)->value('heures_semaine'));
    }

    /**
     * Pré-place les créneaux verrouillés (régénération partielle). Ne gère que
     * les besoins à sous-cours unique (les blocs de groupes sont régénérés).
     */
    private function preplacerFixes(array $creneauxFixes): void
    {
        $parCle = [];
        foreach ($this->besoins as $b) {
            if (count($b['sous_cours']) === 1) {
                $parCle[$b['classe_id'].'_'.$b['matiere_id']][] = $b['id'];
            }
        }

        foreach ($creneauxFixes as $fixe) {
            $cle = ($fixe['classe_id'] ?? '').'_'.($fixe['matiere_id'] ?? '');
            $besoinId = isset($parCle[$cle]) ? array_shift($parCle[$cle]) : null;
            if ($besoinId === null) {
                continue;
            }
            $besoin = $this->besoins[$besoinId];
            $jour = $fixe['jour'];
            $plages = $this->plagesJour[$jour] ?? [];
            $debut = substr($fixe['heure_debut'], 0, 5);
            $i = null;
            foreach ($plages as $idx => $p) {
                if (substr($p->heure_debut, 0, 5) === $debut) {
                    $i = $idx;
                    break;
                }
            }
            if ($i === null || $i + $besoin['nb_plages'] > count($plages)) {
                continue;
            }
            $tranche = array_slice($plages, $i, $besoin['nb_plages']);
            $this->poser($besoin, [
                'jour' => $jour,
                'plages' => array_map(fn ($p) => $p->id, $tranche),
                'heure_debut' => substr($tranche[0]->heure_debut, 0, 5),
                'heure_fin' => substr(end($tranche)->heure_fin, 0, 5),
                'salles' => [$fixe['salle_id'] ?: null],
            ]);
            $this->fixes[] = $besoinId;
        }
    }

    // ── Placement ──────────────────────────────────────────────────────────

    private function trierBesoins(): void
    {
        uasort($this->besoins, fn ($a, $b) => [$this->priorite($a), random_int(0, 99)] <=> [$this->priorite($b), random_int(0, 99)]);
    }

    private function priorite(array $b): int
    {
        if (count($b['sous_cours']) > 1) {
            return 0;                // blocs de groupes : très contraints
        }
        if ($b['famille'] === 'eps') {
            return 1;
        }
        if ($b['salle_type']) {
            return 2;
        }
        if ($b['nb_plages'] >= 2) {
            return 3;
        }

        return 4;
    }

    private function placementGlouton(): void
    {
        foreach ($this->besoins as $besoin) {
            if (isset($this->placements[$besoin['id']])) {
                continue;
            }
            $meilleur = $this->meilleurCandidat($besoin, $besoin['id']);
            if ($meilleur === null) {
                $this->diagnostic['non_placees'][] = "{$besoin['matiere']} — ".$this->nomClasse($besoin['classe_id'])
                    .(count($besoin['sous_cours']) > 1 ? ' (groupes)' : '').' (aucun créneau libre compatible)';

                continue;
            }
            $this->poser($besoin, $meilleur);
        }
    }

    private function ameliorationLocale(): void
    {
        $ordre = array_keys($this->placements);
        for ($round = 0; $round < 8; $round++) {
            shuffle($ordre);
            $bouge = false;
            foreach ($ordre as $besoinId) {
                if (! isset($this->placements[$besoinId]) || in_array($besoinId, $this->fixes, true)) {
                    continue;
                }
                $besoin = $this->besoins[$besoinId];
                $actuel = $this->placements[$besoinId];
                $scoreAct = $this->scorePlacement($besoin, $actuel['jour'], $actuel['plages'], $besoinId);

                $this->retirer($besoinId);
                $meilleur = $this->meilleurCandidat($besoin, $besoinId, $scoreAct);
                $this->poser($besoin, $meilleur ?? $actuel);
                if ($meilleur !== null) {
                    $bouge = true;
                }
            }
            if (! $bouge) {
                break;
            }
        }
    }

    private function meilleurCandidat(array $besoin, int $selfId, float $seuil = INF): ?array
    {
        $meilleur = null;
        foreach ($this->tranchesPossibles($besoin) as $t) {
            if ($this->conflitDur($besoin, $t['jour'], $t['plages'])) {
                continue;
            }
            $s = $this->scorePlacement($besoin, $t['jour'], $t['plages'], $selfId);
            if ($s < $seuil - 0.001) {
                $seuil = $s;
                $meilleur = $t + ['salles' => $this->resoudreSalles($besoin, $t['jour'], $t['plages'])];
            }
        }

        return $meilleur;
    }

    /** @return array<int,array{jour:string,plages:int[],heure_debut:string,heure_fin:string}> */
    private function tranchesPossibles(array $besoin): array
    {
        $out = [];
        foreach ($this->jours as $jour) {
            $plages = $this->plagesJour[$jour] ?? [];
            $n = count($plages);
            for ($i = 0; $i + $besoin['nb_plages'] <= $n; $i++) {
                $contigu = true;
                for ($k = $i; $k < $i + $besoin['nb_plages'] - 1; $k++) {
                    if (substr($plages[$k]->heure_fin, 0, 5) !== substr($plages[$k + 1]->heure_debut, 0, 5)) {
                        $contigu = false;
                        break;
                    }
                }
                if (! $contigu) {
                    continue;
                }
                $tranche = array_slice($plages, $i, $besoin['nb_plages']);
                $out[] = [
                    'jour' => $jour,
                    'plages' => array_map(fn ($p) => $p->id, $tranche),
                    'heure_debut' => substr($tranche[0]->heure_debut, 0, 5),
                    'heure_fin' => substr(end($tranche)->heure_fin, 0, 5),
                ];
            }
        }

        return $out;
    }

    private function resoudreSalles(array $besoin, string $jour, array $plageIds): array
    {
        $salleClasse = optional(Classe::find($besoin['classe_id']))->salle_id;
        $prises = [];
        $salles = [];
        foreach ($besoin['sous_cours'] as $i => $sc) {
            if ($sc['salle_type']) {
                $libre = collect($this->sallesParType[$sc['salle_type']] ?? [])
                    ->first(fn ($sid) => ! in_array($sid, $prises, true) && $this->salleLibre($sid, $jour, $plageIds, $besoin['semaine']));
                $salles[$i] = $libre;
            } elseif ($i === 0) {
                $salles[$i] = $salleClasse;
            } else {
                // groupe supplémentaire : une salle banalisée libre, sinon aucune
                $libre = collect($this->sallesBanalisees)
                    ->first(fn ($sid) => $sid !== $salleClasse && ! in_array($sid, $prises, true) && $this->salleLibre($sid, $jour, $plageIds, $besoin['semaine']));
                $salles[$i] = $libre;
            }
            if ($salles[$i]) {
                $prises[] = $salles[$i];
            }
        }

        return $salles;
    }

    private function salleLibre(int $salleId, string $jour, array $plageIds, string $semaine): bool
    {
        foreach ($plageIds as $pid) {
            if ($this->occupeIncompatible($this->occSalle[$salleId][$jour][$pid] ?? [], $semaine)) {
                return false;
            }
        }

        return true;
    }

    private function conflitDur(array $besoin, string $jour, array $plageIds): bool
    {
        $semaine = $besoin['semaine'];

        foreach ($plageIds as $pid) {
            if ($this->occupeIncompatible($this->occClasse[$besoin['classe_id']][$jour][$pid] ?? [], $semaine)) {
                return true;
            }
        }

        [$debut, $fin] = $this->intervalle($jour, $plageIds);

        foreach ($besoin['sous_cours'] as $sc) {
            $prof = $sc['enseignant_id'];
            if ($prof) {
                foreach ($plageIds as $pid) {
                    if ($this->occupeIncompatible($this->occProf[$prof][$jour][$pid] ?? [], $semaine)) {
                        return true;
                    }
                }
                foreach ($this->indispos[$prof][$jour] ?? [] as $ind) {
                    if ($debut < $ind['fin'] && $fin > $ind['debut']) {
                        return true;
                    }
                }
            }
            // Salle spécialisée : au moins une disponible ?
            if ($sc['salle_type']) {
                $dispo = collect($this->sallesParType[$sc['salle_type']] ?? [])
                    ->contains(fn ($sid) => $this->salleLibre($sid, $jour, $plageIds, $semaine));
                if (! $dispo) {
                    return true;
                }
            }
            // Même niveau déjà en labo à ce moment (matériel)
        }

        if ($besoin['famille'] === 'eps' && ! ($fin <= self::HEURE_CHAUDE_DEBUT || $debut >= self::HEURE_CHAUDE_FIN)) {
            return true;
        }

        return false;
    }

    private function occupeIncompatible(array $liste, string $semaine): bool
    {
        foreach ($liste as $e) {
            if ($semaine === 'toutes' || $e['semaine'] === 'toutes' || $e['semaine'] === $semaine) {
                return true;
            }
        }

        return false;
    }

    private function scorePlacement(array $besoin, string $jour, array $plageIds, int $selfId): float
    {
        $score = 0.0;
        $classeJour = $this->creneauxClasseJour($besoin['classe_id'], $jour, $selfId);
        [$debut, $fin] = $this->intervalle($jour, $plageIds);

        foreach ($classeJour as $c) {
            $adjacent = $c['fin'] === $debut || $c['debut'] === $fin;
            if ($adjacent && $c['famille'] === $besoin['famille'] && $besoin['famille']) {
                if ($besoin['famille'] === 'hist_geo') {
                    $score += 100;
                } elseif (! in_array($besoin['famille'], self::FAMILLES_2H_OK, true)) {
                    $score += 15;
                }
            }
            if ($c['matiere_id'] === $besoin['matiere_id']) {
                $score += 4;
            }
        }

        if ($besoin['effort'] && ($besoin['niveau_ordre'] ?? 9) <= 2) {
            $consecutifs = 1;
            foreach ($classeJour as $c) {
                if ($c['effort'] && ($c['fin'] === $debut || $c['debut'] === $fin)) {
                    $consecutifs++;
                }
            }
            if ($consecutifs >= 4) {
                $score += 20;
            }
        }

        if ($besoin['enseignant_id']) {
            $score += $this->trousProf($besoin['enseignant_id'], $jour, $debut, $fin, $selfId) * 3;
        }

        if (count($plageIds) >= 2 && $debut >= '13:00') {
            $score += 3;
        }

        return $score;
    }

    private function poser(array $besoin, array $cand): void
    {
        $this->placements[$besoin['id']] = $cand;
        $semaine = $besoin['semaine'];

        foreach ($cand['plages'] as $pid) {
            $this->occClasse[$besoin['classe_id']][$cand['jour']][$pid][] = ['besoin' => $besoin['id'], 'semaine' => $semaine];
            foreach ($besoin['sous_cours'] as $i => $sc) {
                if ($sc['enseignant_id']) {
                    $this->occProf[$sc['enseignant_id']][$cand['jour']][$pid][] = ['besoin' => $besoin['id'], 'semaine' => $semaine];
                }
                $salle = $cand['salles'][$i] ?? null;
                if ($salle) {
                    $this->occSalle[$salle][$cand['jour']][$pid][] = ['besoin' => $besoin['id'], 'semaine' => $semaine];
                }
            }
        }
    }

    private function retirer(int $besoinId): void
    {
        $cand = $this->placements[$besoinId] ?? null;
        if (! $cand) {
            return;
        }
        $b = $this->besoins[$besoinId];
        $retire = fn (&$liste) => $liste = array_values(array_filter($liste ?? [], fn ($e) => $e['besoin'] !== $besoinId));

        foreach ($cand['plages'] as $pid) {
            $retire($this->occClasse[$b['classe_id']][$cand['jour']][$pid]);
            foreach ($b['sous_cours'] as $i => $sc) {
                if ($sc['enseignant_id']) {
                    $retire($this->occProf[$sc['enseignant_id']][$cand['jour']][$pid]);
                }
                $salle = $cand['salles'][$i] ?? null;
                if ($salle) {
                    $retire($this->occSalle[$salle][$cand['jour']][$pid]);
                }
            }
        }
        unset($this->placements[$besoinId]);
    }

    // ── Sortie ─────────────────────────────────────────────────────────────

    private function creneauxProduits(): array
    {
        $creneaux = [];
        foreach ($this->placements as $besoinId => $pl) {
            $b = $this->besoins[$besoinId];
            foreach ($b['sous_cours'] as $i => $sc) {
                $creneaux[] = [
                    'classe_id' => $b['classe_id'],
                    'matiere_id' => $sc['matiere_id'],
                    'enseignant_id' => $sc['enseignant_id'],
                    'salle_id' => $pl['salles'][$i] ?? null,
                    'plage_horaire_id' => $pl['plages'][0],
                    'groupe_id' => $sc['groupe_id'],
                    'semaine' => $b['semaine'],
                    'jour' => $pl['jour'],
                    'heure_debut' => $pl['heure_debut'],
                    'heure_fin' => $pl['heure_fin'],
                    'verrouille' => in_array($besoinId, $this->fixes, true),
                ];
            }
        }

        return $creneaux;
    }

    private function score(): int
    {
        $souple = array_sum(array_map(
            fn ($id, $pl) => $this->scorePlacement($this->besoins[$id], $pl['jour'], $pl['plages'], $id),
            array_keys($this->placements),
            $this->placements,
        ));

        return (int) round($souple) + 1000 * count($this->diagnostic['non_placees']);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function intervalle(string $jour, array $plageIds): array
    {
        $plages = collect($this->plagesJour[$jour] ?? [])->whereIn('id', $plageIds)->sortBy('heure_debut')->values();

        return [
            substr($plages->first()->heure_debut, 0, 5),
            substr($plages->last()->heure_fin, 0, 5),
        ];
    }

    private function creneauxClasseJour(int $classeId, string $jour, int $selfId): array
    {
        $out = [];
        foreach ($this->occClasse[$classeId][$jour] ?? [] as $entrees) {
            foreach ($entrees as $e) {
                if ($e['besoin'] === $selfId || isset($out[$e['besoin']]) || ! isset($this->placements[$e['besoin']])) {
                    continue;
                }
                $b = $this->besoins[$e['besoin']];
                [$d, $f] = $this->intervalle($jour, $this->placements[$e['besoin']]['plages']);
                $out[$e['besoin']] = [
                    'matiere_id' => $b['matiere_id'],
                    'famille' => $b['famille'],
                    'effort' => $b['effort'],
                    'debut' => $d,
                    'fin' => $f,
                ];
            }
        }

        return $out;
    }

    private function trousProf(int $profId, string $jour, string $debut, string $fin, int $selfId): int
    {
        $occ = [];
        foreach ($this->occProf[$profId][$jour] ?? [] as $pid => $entrees) {
            foreach ($entrees as $e) {
                if ($e['besoin'] !== $selfId) {
                    $occ[$pid] = true;
                }
            }
        }
        $plages = $this->plagesJour[$jour] ?? [];
        $bornes = [$debut, $fin];
        foreach ($plages as $p) {
            if (isset($occ[$p->id])) {
                $bornes[] = substr($p->heure_debut, 0, 5);
                $bornes[] = substr($p->heure_fin, 0, 5);
            }
        }
        $min = min($bornes);
        $max = max($bornes);

        $trous = 0;
        foreach ($plages as $p) {
            $pd = substr($p->heure_debut, 0, 5);
            $pf = substr($p->heure_fin, 0, 5);
            if ($pd >= $min && $pf <= $max && ! isset($occ[$p->id]) && ! ($pd < $fin && $pf > $debut)) {
                $trous++;
            }
        }

        return $trous;
    }

    private function nomClasse(int $classeId): string
    {
        return optional(Classe::find($classeId))->nom_classe ?? "Classe #{$classeId}";
    }

    private function stats(int $placees): array
    {
        return [
            'nb_besoins' => count($this->besoins),
            'nb_placees' => $placees,
            'nb_non_placees' => count($this->diagnostic['non_placees'] ?? []),
            'jours' => $this->jours,
        ];
    }
}
