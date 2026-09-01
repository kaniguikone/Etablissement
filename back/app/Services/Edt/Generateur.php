<?php

namespace App\Services\Edt;

use App\Models\Classe;
use App\Models\EnseignantIndisponibilite;
use App\Models\NiveauMatiere;
use App\Models\PlageHoraire;
use App\Models\Salle;
use App\Models\VolumeHoraire;
use Illuminate\Support\Facades\DB;

/**
 * Générateur d'emploi du temps — chantier EDT, Lot 2.
 *
 * Heuristique 100 % PHP : construction gloutonne (les séances les plus
 * contraintes d'abord) puis amélioration locale. Le moteur est isolé derrière
 * cette classe : il pourra être remplacé par un solveur externe (OR-Tools) sans
 * toucher au reste (job, persistance, UI).
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

    /** occ[type][id][jour][plage_id] = besoin_id */
    private array $occClasse = [];

    private array $occProf = [];

    private array $occSalle = [];

    /** indispo[prof_id][jour] = [ ['debut'=>, 'fin'=>], ... ] (bloquantes) */
    private array $indispos = [];

    private array $besoins = [];

    private array $placements = [];      // besoin_id => placement

    private array $diagnostic = [];

    /**
     * @param  array{jours?:string[], classe_ids?:int[]}  $params
     * @return array{creneaux:array, score:int, diagnostic:array}
     */
    public function generer(array $params = []): array
    {
        $this->jours = $params['jours'] ?? self::JOURS_DEFAUT;
        $this->diagnostic = ['non_affectees' => [], 'sans_seances' => [], 'non_placees' => []];

        $this->chargerGrille();
        $this->chargerIndispos();
        $this->construireBesoins($params['classe_ids'] ?? null);

        if (empty($this->besoins)) {
            return ['creneaux' => [], 'score' => 0, 'diagnostic' => $this->diagnostic + $this->stats(0)];
        }

        $this->trierBesoins();
        $this->placementGlouton();
        $this->ameliorationLocale();

        $creneaux = [];
        foreach ($this->placements as $besoinId => $pl) {
            $b = $this->besoins[$besoinId];
            $creneaux[] = [
                'classe_id' => $b['classe_id'],
                'matiere_id' => $b['matiere_id'],
                'enseignant_id' => $b['enseignant_id'],
                'salle_id' => $pl['salle_id'],
                'plage_horaire_id' => $pl['plages'][0],
                'jour' => $pl['jour'],
                'heure_debut' => $pl['heure_debut'],
                'heure_fin' => $pl['heure_fin'],
            ];
        }

        $scoreSouple = array_sum(array_map(
            fn ($besoinId, $pl) => $this->scorePlacement($this->besoins[$besoinId], $pl['jour'], $pl['plages'], $pl['salle_id'], $besoinId),
            array_keys($this->placements),
            $this->placements,
        ));
        $score = (int) round($scoreSouple) + 1000 * count($this->diagnostic['non_placees']);

        return [
            'creneaux' => $creneaux,
            'score' => $score,
            'diagnostic' => $this->diagnostic + $this->stats(count($creneaux)),
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

        $seq = 0;
        foreach ($classes as $classe) {
            $programme = NiveauMatiere::with(['matiere', 'seancesTypes'])
                ->where('niveau_id', $classe->niveau_id)
                ->where(fn ($q) => $q->whereNull('serie_id')->orWhere('serie_id', $classe->serie_id))
                ->get();

            $volumes = VolumeHoraire::where('niveau_id', $classe->niveau_id)->pluck('heures_semaine', 'matiere_id');

            foreach ($programme as $nm) {
                $matiere = $nm->matiere;
                if (! $matiere) {
                    continue;
                }
                $profs = $affectations->get($classe->id.'_'.$matiere->id, []);
                if (empty($profs)) {
                    $this->diagnostic['non_affectees'][] = "{$classe->nom_classe} · {$matiere->libelle_matiere}";

                    continue;
                }

                $seances = $nm->seancesTypes->all();
                if (empty($seances)) {
                    // Repli : découper le volume horaire en séances d'une plage.
                    $heures = (int) round((float) ($volumes[$matiere->id] ?? 0));
                    if ($heures < 1) {
                        continue;
                    }
                    $this->diagnostic['sans_seances'][] = "{$classe->nom_classe} · {$matiere->libelle_matiere}";
                    $seances = array_fill(0, $heures, (object) ['duree_minutes' => 55, 'nb_seances' => 1, 'frequence' => 'hebdomadaire', 'tandem_code' => null]);
                }

                foreach ($seances as $s) {
                    $nbPlages = max(1, (int) ceil(($s->duree_minutes ?? 55) / 55));
                    for ($k = 0; $k < ($s->nb_seances ?? 1); $k++) {
                        $this->besoins[$seq] = [
                            'id' => $seq,
                            'classe_id' => $classe->id,
                            'niveau_id' => $classe->niveau_id,
                            'niveau_ordre' => $classe->niveau?->ordre,
                            'matiere_id' => $matiere->id,
                            'matiere' => $matiere->libelle_matiere,
                            'enseignant_id' => $profs[$seq % count($profs)],
                            'nb_plages' => $nbPlages,
                            'salle_type' => $matiere->salle_type_requis,
                            'famille' => $matiere->famille,
                            'effort' => (bool) $matiere->effort_soutenu,
                        ];
                        $seq++;
                    }
                }
            }
        }
    }

    // ── Placement ──────────────────────────────────────────────────────────

    private function trierBesoins(): void
    {
        uasort($this->besoins, function ($a, $b) {
            return [$this->priorite($a), random_int(0, 99)] <=> [$this->priorite($b), random_int(0, 99)];
        });
    }

    private function priorite(array $b): int
    {
        if ($b['famille'] === 'eps') {
            return 0;               // fenêtre horaire très étroite
        }
        if ($b['salle_type']) {
            return 1;               // salles spécialisées peu nombreuses
        }
        if ($b['nb_plages'] >= 2) {
            return 2;               // séances doubles
        }

        return 3;
    }

    private function placementGlouton(): void
    {
        foreach ($this->besoins as $besoin) {
            $meilleur = null;
            $meilleurScore = INF;

            foreach ($this->candidats($besoin) as $cand) {
                if ($this->conflitDur($besoin, $cand['jour'], $cand['plages'], $cand['salle_id'])) {
                    continue;
                }
                $s = $this->scorePlacement($besoin, $cand['jour'], $cand['plages'], $cand['salle_id'], $besoin['id']);
                if ($s < $meilleurScore) {
                    $meilleurScore = $s;
                    $meilleur = $cand;
                }
            }

            if ($meilleur === null) {
                $this->diagnostic['non_placees'][] = "{$this->besoins[$besoin['id']]['matiere']} — "
                    .$this->nomClasse($besoin['classe_id']).' (aucun créneau libre compatible)';

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
                if (! isset($this->placements[$besoinId])) {
                    continue;
                }
                $besoin = $this->besoins[$besoinId];
                $actuel = $this->placements[$besoinId];
                $scoreAct = $this->scorePlacement($besoin, $actuel['jour'], $actuel['plages'], $actuel['salle_id'], $besoinId);

                $this->retirer($besoinId);
                $meilleur = $actuel;
                $meilleurScore = $scoreAct;
                foreach ($this->candidats($besoin) as $cand) {
                    if ($this->conflitDur($besoin, $cand['jour'], $cand['plages'], $cand['salle_id'])) {
                        continue;
                    }
                    $s = $this->scorePlacement($besoin, $cand['jour'], $cand['plages'], $cand['salle_id'], $besoinId);
                    if ($s < $meilleurScore - 0.001) {
                        $meilleurScore = $s;
                        $meilleur = $cand;
                    }
                }
                $this->poser($besoin, $meilleur);
                if ($meilleur !== $actuel) {
                    $bouge = true;
                }
            }
            if (! $bouge) {
                break;
            }
        }
    }

    /** @return array<int,array{jour:string,plages:int[],heure_debut:string,heure_fin:string,salle_id:?int}> */
    private function candidats(array $besoin): array
    {
        $salles = $this->sallesPossibles($besoin);
        $out = [];

        foreach ($this->jours as $jour) {
            $plages = $this->plagesJour[$jour] ?? [];
            $n = count($plages);
            for ($i = 0; $i + $besoin['nb_plages'] <= $n; $i++) {
                // les plages doivent être réellement contiguës (pas de récré entre)
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
                foreach ($salles as $salleId) {
                    $out[] = [
                        'jour' => $jour,
                        'plages' => array_map(fn ($p) => $p->id, $tranche),
                        'heure_debut' => substr($tranche[0]->heure_debut, 0, 5),
                        'heure_fin' => substr(end($tranche)->heure_fin, 0, 5),
                        'salle_id' => $salleId,
                    ];
                }
            }
        }

        return $out;
    }

    private function sallesPossibles(array $besoin): array
    {
        if ($besoin['salle_type']) {
            $ids = Salle::actives()->where('type', $besoin['salle_type'])->pluck('id')->all();

            return $ids ?: [null];
        }
        $salleClasse = optional(Classe::find($besoin['classe_id']))->salle_id;

        return [$salleClasse]; // null accepté (pas de salle assignée)
    }

    private function conflitDur(array $besoin, string $jour, array $plageIds, ?int $salleId): bool
    {
        foreach ($plageIds as $pid) {
            if (isset($this->occClasse[$besoin['classe_id']][$jour][$pid])) {
                return true;
            }
            if (isset($this->occProf[$besoin['enseignant_id']][$jour][$pid])) {
                return true;
            }
            if ($salleId && isset($this->occSalle[$salleId][$jour][$pid])) {
                return true;
            }
        }

        // Indisponibilité bloquante de l'enseignant
        $creneau = $this->intervalle($jour, $plageIds);
        foreach ($this->indispos[$besoin['enseignant_id']][$jour] ?? [] as $ind) {
            if ($creneau[0] < $ind['fin'] && $creneau[1] > $ind['debut']) {
                return true;
            }
        }

        // EPS interdite pendant les heures chaudes
        if ($besoin['famille'] === 'eps') {
            if (! ($creneau[1] <= self::HEURE_CHAUDE_DEBUT || $creneau[0] >= self::HEURE_CHAUDE_FIN)) {
                return true;
            }
        }

        return false;
    }

    private function scorePlacement(array $besoin, string $jour, array $plageIds, ?int $salleId, int $selfId): float
    {
        $score = 0.0;
        $classeJour = $this->creneauxClasseJour($besoin['classe_id'], $jour, $selfId);
        [$debut, $fin] = $this->intervalle($jour, $plageIds);

        // Adjacence même famille (MATIERE_CONSECUTIVE / HG)
        foreach ($classeJour as $c) {
            $adjacent = substr($c['fin'], 0, 5) === $debut || substr($c['debut'], 0, 5) === $fin;
            if ($adjacent && $c['famille'] === $besoin['famille'] && $besoin['famille']) {
                if ($besoin['famille'] === 'hist_geo') {
                    $score += 100;
                } elseif (! in_array($besoin['famille'], self::FAMILLES_2H_OK, true)) {
                    $score += 15;
                }
            }
            // Répartition : même matière déjà présente ce jour
            if ($c['matiere_id'] === $besoin['matiere_id']) {
                $score += 4;
            }
        }

        // Blocs d'effort soutenu en 6e/5e
        if ($besoin['effort'] && ($besoin['niveau_ordre'] ?? 9) <= 2) {
            $consecutifs = 1;
            foreach ($classeJour as $c) {
                if ($c['effort'] && (substr($c['fin'], 0, 5) === $debut || substr($c['debut'], 0, 5) === $fin)) {
                    $consecutifs++;
                }
            }
            if ($consecutifs >= 4) {
                $score += 20;
            }
        }

        // Trous de l'enseignant ce jour
        $score += $this->trousProf($besoin['enseignant_id'], $jour, $debut, $fin, $selfId) * 3;

        // Séances doubles plutôt le matin
        if (count($plageIds) >= 2 && $debut >= '13:00') {
            $score += 3;
        }

        return $score;
    }

    private function poser(array $besoin, array $cand): void
    {
        $this->placements[$besoin['id']] = $cand;
        foreach ($cand['plages'] as $pid) {
            $this->occClasse[$besoin['classe_id']][$cand['jour']][$pid] = $besoin['id'];
            $this->occProf[$besoin['enseignant_id']][$cand['jour']][$pid] = $besoin['id'];
            if ($cand['salle_id']) {
                $this->occSalle[$cand['salle_id']][$cand['jour']][$pid] = $besoin['id'];
            }
        }
    }

    private function retirer(int $besoinId): void
    {
        $b = $this->besoins[$besoinId];
        $cand = $this->placements[$besoinId] ?? null;
        if (! $cand) {
            return;
        }
        foreach ($cand['plages'] as $pid) {
            unset($this->occClasse[$b['classe_id']][$cand['jour']][$pid]);
            unset($this->occProf[$b['enseignant_id']][$cand['jour']][$pid]);
            if ($cand['salle_id']) {
                unset($this->occSalle[$cand['salle_id']][$cand['jour']][$pid]);
            }
        }
        unset($this->placements[$besoinId]);
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
        foreach ($this->occClasse[$classeId][$jour] ?? [] as $besoinId) {
            if ($besoinId === $selfId || ! isset($this->placements[$besoinId])) {
                continue;
            }
            $b = $this->besoins[$besoinId];
            $pl = $this->placements[$besoinId];
            [$d, $f] = $this->intervalle($jour, $pl['plages']);
            $out[$besoinId] = [
                'matiere_id' => $b['matiere_id'],
                'famille' => $b['famille'],
                'effort' => $b['effort'],
                'debut' => $d,
                'fin' => $f,
            ];
        }

        return $out;
    }

    private function trousProf(int $profId, string $jour, string $debut, string $fin, int $selfId): int
    {
        $occ = [];
        foreach ($this->occProf[$profId][$jour] ?? [] as $pid => $besoinId) {
            if ($besoinId !== $selfId) {
                $occ[$pid] = true;
            }
        }
        $plages = $this->plagesJour[$jour] ?? [];
        // fenêtre = du 1er au dernier cours du prof ce jour, self inclus
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
            $dansFenetre = $pd >= $min && $pf <= $max;
            $occupe = isset($occ[$p->id]) || ($pd < $fin && $pf > $debut);
            if ($dansFenetre && ! $occupe) {
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
