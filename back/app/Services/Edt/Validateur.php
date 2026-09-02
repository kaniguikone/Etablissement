<?php

namespace App\Services\Edt;

use App\Models\EdtContrainte;
use App\Models\EnseignantIndisponibilite;
use App\Models\PlageHoraire;
use App\Models\VolumeHoraire;
use Illuminate\Support\Collection;

/**
 * Vérifie qu'un ensemble de créneaux d'emploi du temps respecte les règles de
 * confection MENET (chantier EDT — Lot 1).
 *
 * Fonctionne aussi bien sur un EDT saisi à la main (contrôle qualité) que sur
 * une proposition du futur générateur. Ne modifie rien.
 */
class Validateur
{
    /** code => méthode de vérification. */
    private const REGLES = [
        'ENSEIGNANT_DOUBLE' => 'enseignantDouble',
        'CLASSE_DOUBLE' => 'classeDouble',
        'SALLE_DOUBLE' => 'salleDouble',
        'SALLE_SPECIALISEE' => 'salleSpecialisee',
        'NIVEAU_LABO_SIMULTANE' => 'niveauLaboSimultane',
        'EPS_HEURES_CHAUDES' => 'epsHeuresChaudes',
        'HG_PAS_CONSECUTIF' => 'hgPasConsecutif',
        'MATIERE_CONSECUTIVE' => 'matiereConsecutive',
        'INDISPO_BLOQUANTE' => 'indispoBloquante',
        'INDISPO_PREFERENCE' => 'indispoPreference',
        'CAPACITE_SALLE' => 'capaciteSalle',
        'SALLE_ATTITREE' => 'salleAttitree',
        'VOLUME_HORAIRE' => 'volumeHoraire',
        'TANDEM_MEME_JOUR' => 'tandemMemeJour',
        'GROUPES_PARALLELES' => 'groupesParalleles',
        'REPARTITION_SEMAINE' => 'repartitionSemaine',
        'PAS_5H_EFFORT' => 'pas5hEffort',
        'TROUS_ENSEIGNANT' => 'trousEnseignant',
        'EQUILIBRE_JOURNEE' => 'equilibreJournee',
    ];

    /** @var Collection<string,EdtContrainte> */
    private Collection $contraintes;

    public function __construct(?Collection $contraintes = null)
    {
        $this->contraintes = ($contraintes ?? EdtContrainte::actives()->get())->keyBy('code');
    }

    /**
     * @param  Collection  $creneaux  EmploiDuTemps avec classe.niveau, matiere, enseignant, salle chargés
     * @return array{score:int, nb_dures:int, nb_souples:int, violations:array<int,array>}
     */
    public function analyser(Collection $creneaux): array
    {
        $ctx = $this->contexte($creneaux);
        $violations = [];

        foreach (self::REGLES as $code => $methode) {
            $contrainte = $this->contraintes->get($code);
            if (! $contrainte) {
                continue;
            }
            $params = $contrainte->parametres ?? [];
            foreach ($this->{$methode}($creneaux, $ctx, $params) as $v) {
                $violations[] = [
                    'code' => $code,
                    'libelle' => $contrainte->libelle,
                    'nature' => $contrainte->nature,
                    'poids' => (int) $contrainte->poids,
                    'message' => $v['message'],
                    'classe' => $v['classe'] ?? null,
                    'enseignant' => $v['enseignant'] ?? null,
                    'jour' => $v['jour'] ?? null,
                ];
            }
        }

        $nbDures = collect($violations)->where('nature', 'dure')->count();
        $nbSouples = collect($violations)->where('nature', 'souple')->count();
        // Score : pénalité forte par violation dure + somme pondérée des souples.
        $score = collect($violations)->sum(fn ($v) => $v['nature'] === 'dure' ? 1000 : $v['poids']);

        return [
            'score' => $score,
            'nb_dures' => $nbDures,
            'nb_souples' => $nbSouples,
            'violations' => $violations,
        ];
    }

    // ── Contexte ────────────────────────────────────────────────────────────

    private function contexte(Collection $creneaux): array
    {
        return [
            'plages' => PlageHoraire::orderBy('heure_debut')->get(),
            'volumes' => VolumeHoraire::get()->groupBy('niveau_id'),
            'indispos' => EnseignantIndisponibilite::whereIn('enseignant_id', $creneaux->pluck('enseignant_id')->unique())
                ->get()->groupBy('enseignant_id'),
            'groupes' => \App\Models\GroupePedagogique::whereIn('id', $creneaux->pluck('groupe_id')->filter()->unique())
                ->get()->keyBy('id'),
        ];
    }

    private function hhmm(?string $t): string
    {
        return substr((string) $t, 0, 5);
    }

    private function chevauche(array|object $a, array|object $b): bool
    {
        $ad = $this->hhmm(is_array($a) ? $a['heure_debut'] : $a->heure_debut);
        $af = $this->hhmm(is_array($a) ? $a['heure_fin'] : $a->heure_fin);
        $bd = $this->hhmm(is_array($b) ? $b['heure_debut'] : $b->heure_debut);
        $bf = $this->hhmm(is_array($b) ? $b['heure_fin'] : $b->heure_fin);

        return $ad < $bf && $af > $bd;
    }

    /** Deux créneaux en semaines opposées (A vs B) ne se gênent pas. */
    private function semainesCompatibles(object $a, object $b): bool
    {
        $sa = $a->semaine ?? 'toutes';
        $sb = $b->semaine ?? 'toutes';

        return $sa !== 'toutes' && $sb !== 'toutes' && $sa !== $sb;
    }

    /** Groupes parallèles d'une même classe (LV2, dédoublement) : cours simultanés normaux. */
    private function memeGroupeParallele(object $a, object $b): bool
    {
        return $a->groupe_id && $b->groupe_id && $a->groupe_id !== $b->groupe_id;
    }

    private function dureeHeures(object $c): float
    {
        return (strtotime($c->heure_fin) - strtotime($c->heure_debut)) / 3600;
    }

    private function nomClasse(object $c): ?string
    {
        return $c->classe?->nom_classe;
    }

    private function nomEnseignant(object $c): ?string
    {
        return $c->enseignant ? trim("{$c->enseignant->nom_enseignant} {$c->enseignant->prenoms_enseignant}") : null;
    }

    /**
     * Paires de créneaux consécutifs (fin de l'un = début de l'autre, donc sans
     * récréation ni pause entre les deux) d'une même liste, même jour.
     *
     * @return array<int,array{0:object,1:object}>
     */
    private function pairesConsecutives(Collection $creneaux): array
    {
        $paires = [];
        foreach ($creneaux->groupBy('jour') as $duJour) {
            $tries = $duJour->sortBy(fn ($c) => $this->hhmm($c->heure_debut))->values();
            for ($i = 0; $i < $tries->count() - 1; $i++) {
                if ($this->hhmm($tries[$i]->heure_fin) === $this->hhmm($tries[$i + 1]->heure_debut)) {
                    $paires[] = [$tries[$i], $tries[$i + 1]];
                }
            }
        }

        return $paires;
    }

    // ── Contraintes dures ───────────────────────────────────────────────────

    private function enseignantDouble(Collection $creneaux, array $ctx, array $p): array
    {
        return $this->collisions($creneaux, 'enseignant_id', fn ($c) => "{$this->nomEnseignant($c)} a deux cours le {$c->jour} à ".$this->hhmm($c->heure_debut), 'enseignant');
    }

    private function classeDouble(Collection $creneaux, array $ctx, array $p): array
    {
        return $this->collisions($creneaux, 'classe_id', fn ($c) => "{$this->nomClasse($c)} a deux cours le {$c->jour} à ".$this->hhmm($c->heure_debut), 'classe');
    }

    private function salleDouble(Collection $creneaux, array $ctx, array $p): array
    {
        return $this->collisions(
            $creneaux->filter(fn ($c) => $c->salle_id),
            'salle_id',
            fn ($c) => "La salle « {$c->salle?->nom} » accueille deux classes le {$c->jour} à ".$this->hhmm($c->heure_debut),
        );
    }

    private function collisions(Collection $creneaux, string $cle, callable $message, ?string $type = null): array
    {
        $violations = [];
        foreach ($creneaux->groupBy($cle) as $groupe) {
            $liste = $groupe->values();
            for ($i = 0; $i < $liste->count(); $i++) {
                for ($j = $i + 1; $j < $liste->count(); $j++) {
                    if ($liste[$i]->jour === $liste[$j]->jour
                        && $this->chevauche($liste[$i], $liste[$j])
                        && ! $this->semainesCompatibles($liste[$i], $liste[$j])
                        && ! $this->memeGroupeParallele($liste[$i], $liste[$j])) {
                        $c = $liste[$i];
                        $violations[] = [
                            'message' => $message($c),
                            'jour' => $c->jour,
                            'classe' => $this->nomClasse($c),
                            'enseignant' => $type === 'enseignant' ? $this->nomEnseignant($c) : null,
                        ];
                    }
                }
            }
        }

        return $violations;
    }

    private function salleSpecialisee(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        foreach ($creneaux as $c) {
            $requis = $c->matiere?->salle_type_requis;
            if (! $requis) {
                continue;
            }
            if (! $c->salle || $c->salle->type !== $requis) {
                $violations[] = [
                    'message' => "{$this->nomClasse($c)} · {$c->matiere?->libelle_matiere} le {$c->jour} : salle « {$requis} » requise"
                        .($c->salle ? " (actuellement « {$c->salle->nom} »)" : ' (aucune salle)'),
                    'jour' => $c->jour,
                    'classe' => $this->nomClasse($c),
                ];
            }
        }

        return $violations;
    }

    private function niveauLaboSimultane(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        $labos = $creneaux->filter(fn ($c) => $c->salle && $c->salle->type === 'labo');
        $groupes = $labos->groupBy(fn ($c) => $c->jour.'|'.$this->hhmm($c->heure_debut).'|'.$c->classe?->niveau_id);
        foreach ($groupes as $g) {
            if ($g->count() > 1) {
                $c = $g->first();
                $violations[] = [
                    'message' => "{$g->count()} classes de {$c->classe?->niveau?->nom_niveau} en laboratoire le {$c->jour} à ".$this->hhmm($c->heure_debut),
                    'jour' => $c->jour,
                ];
            }
        }

        return $violations;
    }

    private function epsHeuresChaudes(Collection $creneaux, array $ctx, array $p): array
    {
        $debut = $p['debut'] ?? '10:00';
        $fin = $p['fin'] ?? '16:00';
        $violations = [];
        foreach ($creneaux->filter(fn ($c) => $c->matiere?->famille === 'eps') as $c) {
            $ok = $this->hhmm($c->heure_fin) <= $debut || $this->hhmm($c->heure_debut) >= $fin;
            if (! $ok) {
                $violations[] = [
                    'message' => "EPS de {$this->nomClasse($c)} le {$c->jour} à ".$this->hhmm($c->heure_debut)." (interdit entre {$debut} et {$fin})",
                    'jour' => $c->jour,
                    'classe' => $this->nomClasse($c),
                ];
            }
        }

        return $violations;
    }

    private function hgPasConsecutif(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        foreach ($creneaux->groupBy('classe_id') as $classe) {
            foreach ($this->pairesConsecutives($classe) as [$a, $b]) {
                if ($a->matiere?->famille === 'hist_geo' && $b->matiere?->famille === 'hist_geo') {
                    $violations[] = [
                        'message' => "{$this->nomClasse($a)} : Histoire-Géo sur deux heures consécutives le {$a->jour} à ".$this->hhmm($a->heure_debut),
                        'jour' => $a->jour,
                        'classe' => $this->nomClasse($a),
                    ];
                }
            }
        }

        return $violations;
    }

    private function matiereConsecutive(Collection $creneaux, array $ctx, array $p): array
    {
        $exemptees = $p['familles_exemptees'] ?? [];
        $violations = [];
        foreach ($creneaux->groupBy('classe_id') as $classe) {
            foreach ($this->pairesConsecutives($classe) as [$a, $b]) {
                $fam = $a->matiere?->famille;
                if (! $fam || $fam === 'hist_geo' || $b->matiere?->famille !== $fam) {
                    continue; // HG traité à part ; on ne compare que des matières de même famille
                }
                if (in_array($fam, $exemptees, true)) {
                    continue;
                }
                // Une séance déjà « longue » (≥ 90 min) est un bloc autorisé.
                if ($this->dureeHeures($a) >= 1.5 || $this->dureeHeures($b) >= 1.5) {
                    continue;
                }
                $violations[] = [
                    'message' => "{$this->nomClasse($a)} · {$a->matiere?->libelle_matiere} sur deux heures consécutives le {$a->jour} à ".$this->hhmm($a->heure_debut),
                    'jour' => $a->jour,
                    'classe' => $this->nomClasse($a),
                ];
            }
        }

        return $violations;
    }

    private function indispoBloquante(Collection $creneaux, array $ctx, array $p): array
    {
        return $this->indispo($creneaux, $ctx, 'bloquant');
    }

    private function indispoPreference(Collection $creneaux, array $ctx, array $p): array
    {
        return $this->indispo($creneaux, $ctx, 'preference');
    }

    private function indispo(Collection $creneaux, array $ctx, string $type): array
    {
        $violations = [];
        foreach ($creneaux as $c) {
            $indispos = $ctx['indispos'][$c->enseignant_id] ?? collect();
            foreach ($indispos as $ind) {
                if ($ind->type !== $type || $ind->jour !== $c->jour) {
                    continue;
                }
                $enConflit = $ind->plage_horaire_id
                    ? $ind->plage_horaire_id === $c->plage_horaire_id
                    : ($ind->heure_debut && $this->chevauche($c, $ind));
                if ($enConflit) {
                    $violations[] = [
                        'message' => "{$this->nomEnseignant($c)} : cours le {$c->jour} à ".$this->hhmm($c->heure_debut)
                            .($type === 'bloquant' ? ' sur une indisponibilité' : ' malgré une préférence contraire'),
                        'jour' => $c->jour,
                        'enseignant' => $this->nomEnseignant($c),
                    ];
                }
            }
        }

        return $violations;
    }

    private function capaciteSalle(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        foreach ($creneaux as $c) {
            $cap = $c->salle?->capacite;
            $eff = $c->classe?->effectif_max_classe;
            if ($cap && $eff && $cap < $eff) {
                $violations[] = [
                    'message' => "{$this->nomClasse($c)} ({$eff} élèves) le {$c->jour} en salle « {$c->salle->nom} » ({$cap} places)",
                    'jour' => $c->jour,
                    'classe' => $this->nomClasse($c),
                ];
            }
        }

        return $violations;
    }

    private function salleAttitree(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        $vues = [];
        foreach ($creneaux as $c) {
            if ($c->matiere?->salle_type_requis || ! $c->classe?->salle_id || ! $c->salle_id) {
                continue;
            }
            if ((int) $c->salle_id !== (int) $c->classe->salle_id) {
                $cle = $c->classe_id;
                if (isset($vues[$cle])) {
                    continue; // une seule alerte par classe
                }
                $vues[$cle] = true;
                $violations[] = [
                    'message' => "{$this->nomClasse($c)} a des cours hors de sa salle attitrée (les élèves ne devraient pas se déplacer)",
                    'classe' => $this->nomClasse($c),
                ];
            }
        }

        return $violations;
    }

    private function volumeHoraire(Collection $creneaux, array $ctx, array $p): array
    {
        $tolerance = (float) ($p['tolerance_heures'] ?? 0.5);
        $violations = [];

        foreach ($creneaux->groupBy('classe_id') as $classe) {
            $premier = $classe->first();
            $niveauId = $premier->classe?->niveau_id;
            $volumesNiveau = $ctx['volumes'][$niveauId] ?? collect();
            if ($volumesNiveau->isEmpty()) {
                continue;
            }
            $parMatiere = $classe->groupBy('matiere_id');
            foreach ($volumesNiveau as $vh) {
                $place = $parMatiere->get($vh->matiere_id, collect())->sum(fn ($c) => $this->dureeHeures($c));
                $ecart = round($place - (float) $vh->heures_semaine, 1);
                if (abs($ecart) > $tolerance) {
                    $violations[] = [
                        'message' => "{$this->nomClasse($premier)} · {$vh->matiere?->libelle_matiere} : "
                            .round($place, 1)." h placées pour {$vh->heures_semaine} h prévues",
                        'classe' => $this->nomClasse($premier),
                    ];
                }
            }
        }

        return $violations;
    }

    private function tandemMemeJour(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        foreach ($creneaux->groupBy('classe_id') as $classe) {
            $joursPc = $classe->filter(fn ($c) => $c->matiere?->famille === 'pc')->pluck('jour')->unique();
            $joursSvt = $classe->filter(fn ($c) => $c->matiere?->famille === 'svt')->pluck('jour')->unique();
            if ($joursPc->isNotEmpty() && $joursSvt->isNotEmpty() && $joursPc->intersect($joursSvt)->isEmpty()) {
                $violations[] = [
                    'message' => "{$this->nomClasse($classe->first())} : Physique-Chimie et SVT ne sont jamais le même jour",
                    'classe' => $this->nomClasse($classe->first()),
                ];
            }
        }

        return $violations;
    }

    /**
     * Les groupes parallèles d'une même classe (même parallele_code) doivent
     * être placés sur le même créneau (la classe se scinde en même temps).
     */
    private function groupesParalleles(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        $avecGroupe = $creneaux->filter(fn ($c) => $c->groupe_id && isset($ctx['groupes'][$c->groupe_id]));

        $blocs = $avecGroupe->groupBy(fn ($c) => $c->classe_id.'|'.$ctx['groupes'][$c->groupe_id]->parallele_code);
        foreach ($blocs as $bloc) {
            $nbGroupes = $bloc->pluck('groupe_id')->unique()->count();
            if ($nbGroupes < 2) {
                continue;
            }
            foreach ($bloc->groupBy(fn ($c) => $c->jour.' '.$this->hhmm($c->heure_debut)) as $instant => $cs) {
                if ($cs->pluck('groupe_id')->unique()->count() < $nbGroupes) {
                    $c = $cs->first();
                    $g = $ctx['groupes'][$c->groupe_id];
                    $violations[] = [
                        'message' => "{$this->nomClasse($c)} · {$g->parallele_code} : groupes désynchronisés le {$instant}",
                        'jour' => $c->jour,
                        'classe' => $this->nomClasse($c),
                    ];
                }
            }
        }

        return $violations;
    }

    // ── Contraintes souples ────────────────────────────────────────────────

    private function repartitionSemaine(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        foreach ($creneaux->groupBy('classe_id') as $classe) {
            foreach ($classe->groupBy('matiere_id') as $matiere) {
                if ($matiere->count() >= 3 && $matiere->pluck('jour')->unique()->count() === 1) {
                    $c = $matiere->first();
                    $violations[] = [
                        'message' => "{$this->nomClasse($c)} · {$c->matiere?->libelle_matiere} : toutes les heures le même jour",
                        'jour' => $c->jour,
                        'classe' => $this->nomClasse($c),
                    ];
                }
            }
        }

        return $violations;
    }

    private function pas5hEffort(Collection $creneaux, array $ctx, array $p): array
    {
        $maxConsecutif = (int) ($p['max_consecutif'] ?? 4);
        $violations = [];

        foreach ($creneaux->groupBy('classe_id') as $classe) {
            $ordre = $classe->first()->classe?->niveau?->ordre;
            if ($ordre === null || $ordre > 2) {
                continue; // 6e / 5e uniquement
            }
            foreach ($classe->groupBy('jour') as $jour => $duJour) {
                $tries = $duJour->sortBy(fn ($c) => $this->hhmm($c->heure_debut))->values();
                $run = 0;
                foreach ($tries as $i => $c) {
                    $effort = (bool) $c->matiere?->effort_soutenu;
                    $contigu = $i === 0 || $this->hhmm($tries[$i - 1]->heure_fin) === $this->hhmm($c->heure_debut);
                    $run = ($effort && $contigu) ? $run + 1 : ($effort ? 1 : 0);
                    if ($run >= $maxConsecutif) {
                        $violations[] = [
                            'message' => "{$this->nomClasse($c)} : {$run} heures d'affilée de matières exigeantes le {$jour}",
                            'jour' => $jour,
                            'classe' => $this->nomClasse($c),
                        ];
                        break;
                    }
                }
            }
        }

        return $violations;
    }

    private function trousEnseignant(Collection $creneaux, array $ctx, array $p): array
    {
        $violations = [];
        $plagesCours = $ctx['plages']->where('type', 'cours');

        foreach ($creneaux->groupBy('enseignant_id') as $enseignant) {
            foreach ($enseignant->groupBy('jour') as $jour => $duJour) {
                $tries = $duJour->sortBy(fn ($c) => $this->hhmm($c->heure_debut))->values();
                if ($tries->count() < 2) {
                    continue;
                }
                $min = $this->hhmm($tries->first()->heure_debut);
                $max = $this->hhmm($tries->last()->heure_fin);
                $occupe = $tries->map(fn ($c) => $this->hhmm($c->heure_debut).'-'.$this->hhmm($c->heure_fin));

                $trous = $plagesCours
                    ->filter(fn ($pl) => ($pl->jour === $jour || $pl->jour === null)
                        && $this->hhmm($pl->heure_debut) >= $min
                        && $this->hhmm($pl->heure_fin) <= $max
                        && ! $occupe->contains($this->hhmm($pl->heure_debut).'-'.$this->hhmm($pl->heure_fin)))
                    ->count();

                if ($trous > 0) {
                    $violations[] = [
                        'message' => "{$this->nomEnseignant($tries->first())} : {$trous} heure(s) creuse(s) le {$jour}",
                        'jour' => $jour,
                        'enseignant' => $this->nomEnseignant($tries->first()),
                    ];
                }
            }
        }

        return $violations;
    }

    private function equilibreJournee(Collection $creneaux, array $ctx, array $p): array
    {
        $ecartMax = (float) ($p['ecart_max_heures'] ?? 3);
        $violations = [];

        foreach ($creneaux->groupBy('classe_id') as $classe) {
            $parJour = $classe->groupBy('jour')->map(fn ($j) => $j->sum(fn ($c) => $this->dureeHeures($c)));
            if ($parJour->count() < 2) {
                continue;
            }
            if ($parJour->max() - $parJour->min() > $ecartMax) {
                $c = $classe->first();
                $violations[] = [
                    'message' => "{$this->nomClasse($c)} : journées déséquilibrées ("
                        .round($parJour->min(), 1).' h à '.round($parJour->max(), 1).' h)',
                    'classe' => $this->nomClasse($c),
                ];
            }
        }

        return $violations;
    }
}
