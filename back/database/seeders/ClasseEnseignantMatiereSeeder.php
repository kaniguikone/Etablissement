<?php

namespace Database\Seeders;

use App\Models\Classe;
use App\Models\Enseignant;
use App\Models\Matiere;
use App\Models\Niveau;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Règles d'affectation :
 *
 * Matières de base (TOUS les niveaux) : MATH, FR, ANG, SVT, HG, SPC, EPS, MUSQ, AP
 * Philosophie (PHI)  : uniquement 1ère et Terminale
 * Allemand  (ALL)    : à partir de 4ième, jamais dans une classe qui a Espagnol
 * Espagnol  (ESP)    : à partir de 4ième, jamais dans une classe qui a Allemand
 *                      → alternance par position : position paire = ALL, impaire = ESP
 *
 * Chaque enseignant  : max 3 matières différentes, max 7 classes distinctes
 */
class ClasseEnseignantMatiereSeeder extends Seeder
{
    // Rang de chaque niveau (1 = 6ième … 7 = Terminale)
    private const RANG = [
        'Sixième'   => 1,
        'Cinquième' => 2,
        'Quatrième' => 3,
        'Troisième' => 4,
        'Seconde'   => 5,
        'Première'  => 6,
        'Terminale' => 7,
    ];

    public function run(): void
    {
        DB::table('classe_enseignant_matiere')->truncate();

        $classes     = Classe::orderBy('niveau_id')->orderBy('id')->get();
        $enseignants = Enseignant::all();
        $matieres    = Matiere::all()->keyBy('abbr_matiere');

        if ($classes->isEmpty() || $enseignants->isEmpty() || $matieres->isEmpty()) {
            $this->command->warn('Données manquantes — lance DatabaseSeeder d\'abord.');
            return;
        }

        // Rang de chaque niveau
        $rangParNiveau = Niveau::all()->keyBy('id')
            ->map(fn ($n) => self::RANG[$n->nom_niveau] ?? 1);

        // IDs des matières
        $idsBase = array_values(array_filter([
            $matieres['MATH']?->id,
            $matieres['FR']?->id,
            $matieres['ANG']?->id,
            $matieres['SVT']?->id,
            $matieres['HG']?->id,
            $matieres['SPC']?->id,
            $matieres['EPS']?->id,
            $matieres['MUSQ']?->id,
            $matieres['AP']?->id,
        ]));
        $idALL = $matieres['ALL']?->id;
        $idESP = $matieres['ESP']?->id;
        $idPHI = $matieres['PHI']?->id;

        // ── Étape 1 : matières par classe (règles strictes) ──────────────────

        // Position de chaque classe dans son niveau (pour l'alternance ALL/ESP)
        $posParClasse = [];
        foreach ($classes->groupBy('niveau_id') as $classesNiveau) {
            foreach ($classesNiveau->values() as $pos => $classe) {
                $posParClasse[$classe->id] = $pos;
            }
        }

        $matieresParClasse = []; // classe_id => [matiere_id, ...]

        foreach ($classes as $classe) {
            $rang = $rangParNiveau[$classe->niveau_id] ?? 1;
            $pos  = $posParClasse[$classe->id] ?? 0;

            $mats = $idsBase; // toutes les matières de base

            // ALL ou ESP à partir de 4ième — jamais les deux dans la même classe
            if ($rang >= 3 && $idALL && $idESP) {
                $mats[] = ($pos % 2 === 0) ? $idALL : $idESP;
            }

            // Philosophie uniquement en 1ère et Terminale
            if ($rang >= 6 && $idPHI) {
                $mats[] = $idPHI;
            }

            $matieresParClasse[$classe->id] = array_values(array_unique($mats));
        }

        // Vérification intégrité ALL / ESP
        $erreurs = 0;
        foreach ($matieresParClasse as $cid => $mats) {
            if ($idALL && $idESP && in_array($idALL, $mats) && in_array($idESP, $mats)) {
                $this->command->error("Classe $cid a ALL et ESP — bug dans la logique !");
                $erreurs++;
            }
        }
        if ($erreurs > 0) return;

        // ── Étape 2 : nombre d'enseignants nécessaires par matière ───────────
        // Règle : 1 enseignant pour au plus 7 classes → ceil(nbClasses / 7)

        $classesParMatiere = []; // matiere_id => nb classes qui l'enseignent
        foreach ($matieresParClasse as $mats) {
            foreach ($mats as $mid) {
                $classesParMatiere[$mid] = ($classesParMatiere[$mid] ?? 0) + 1;
            }
        }

        $ensNeededParMatiere = []; // matiere_id => nb enseignants requis
        foreach ($classesParMatiere as $mid => $nbClasses) {
            $ensNeededParMatiere[$mid] = max(1, (int) ceil($nbClasses / 7));
        }

        // ── Étape 3 : affectation déterministe enseignant → matières ─────────
        // On distribue les enseignants par round-robin en respectant max 3 matières

        $ensList        = $enseignants->values()->all();
        $nbEns          = count($ensList);
        $specParEns     = [];  // enseignant_id => [matiere_id, ...]
        $ensParMatiere  = [];  // matiere_id     => [enseignant_id, ...]

        foreach ($ensList as $ens) {
            $specParEns[$ens->id] = [];
        }

        $cursor = 0;

        foreach ($ensNeededParMatiere as $mid => $nbReqis) {
            $affectes = 0;
            $essais   = 0;

            while ($affectes < $nbReqis && $essais < $nbEns * 3) {
                $ens = $ensList[$cursor % $nbEns];
                $cursor++;
                $essais++;

                // Max 3 matières par enseignant, ne pas réaffecter la même matière
                if (
                    count($specParEns[$ens->id]) < 3 &&
                    !in_array($mid, $specParEns[$ens->id])
                ) {
                    $specParEns[$ens->id][] = $mid;
                    $ensParMatiere[$mid][]   = $ens->id;
                    $affectes++;
                }
            }

            if ($affectes < $nbReqis) {
                $this->command->warn("Seulement $affectes/$nbReqis enseignants pour matière $mid");
            }
        }

        // ── Étape 4 : affectation (classe × matière) → enseignant ────────────
        // On compte les CLASSES DISTINCTES par enseignant (pas les paires classe×matière)

        $classesDistinctesParEns = array_fill_keys(array_keys($specParEns), []);
        $rows = [];

        foreach ($matieresParClasse as $classeId => $matiereIds) {
            foreach ($matiereIds as $mid) {
                $candidats = $ensParMatiere[$mid] ?? [];

                // Trier par nombre de classes distinctes (le moins chargé en premier)
                usort($candidats, fn ($a, $b) =>
                    count($classesDistinctesParEns[$a] ?? []) <=>
                    count($classesDistinctesParEns[$b] ?? [])
                );

                // Prendre le premier candidat sous la limite de 7 classes
                $choisi = null;
                foreach ($candidats as $eid) {
                    if (count($classesDistinctesParEns[$eid] ?? []) < 7) {
                        $choisi = $eid;
                        break;
                    }
                }

                // Repli 1 : dépasser la limite si nécessaire (le moins chargé)
                if ($choisi === null && !empty($candidats)) {
                    $choisi = $candidats[0];
                }

                // Repli 2 (extrême) : n'importe quel enseignant
                if ($choisi === null) {
                    $tous = array_keys($specParEns);
                    usort($tous, fn ($a, $b) =>
                        count($classesDistinctesParEns[$a] ?? []) <=>
                        count($classesDistinctesParEns[$b] ?? [])
                    );
                    $choisi = $tous[0];
                }

                // Mettre à jour le compteur de classes distinctes
                if (!in_array($classeId, $classesDistinctesParEns[$choisi])) {
                    $classesDistinctesParEns[$choisi][] = $classeId;
                }

                $rows[] = [
                    'classe_id'     => $classeId,
                    'enseignant_id' => $choisi,
                    'matiere_id'    => $mid,
                ];
            }
        }

        // Insertion par lots
        foreach (array_chunk($rows, 300) as $chunk) {
            DB::table('classe_enseignant_matiere')->insert($chunk);
        }

        // Statistiques
        $nbClassesParEns = array_map(fn ($cl) => count($cl), $classesDistinctesParEns);
        $max = !empty($nbClassesParEns) ? max($nbClassesParEns) : 0;
        $avg = count($ensList) > 0
            ? round(array_sum($nbClassesParEns) / count($ensList), 1)
            : 0;

        $this->command->info('✓ ' . count($rows) . ' affectations insérées.');
        $this->command->info("  → max classes distinctes/enseignant : {$max}, moyenne : {$avg}");
    }
}
