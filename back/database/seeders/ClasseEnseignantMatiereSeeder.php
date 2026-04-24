<?php

namespace Database\Seeders;

use App\Models\Classe;
use App\Models\Enseignant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Affecte les matières aux classes en s'appuyant sur la table niveau_matieres
 * (alimentée depuis le template du cycle), puis assigne un enseignant par
 * triplet (classe × matière).
 *
 * Règles enseignants : max 3 matières différentes, max 7 classes distinctes.
 */
class ClasseEnseignantMatiereSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('classe_enseignant_matiere')->truncate();

        $classes     = Classe::orderBy('niveau_id')->orderBy('id')->get();
        $enseignants = Enseignant::all();

        if ($classes->isEmpty() || $enseignants->isEmpty()) {
            $this->command->warn('Données manquantes (classes ou enseignants absents).');
            return;
        }

        // Matières par niveau depuis niveau_matieres (union de toutes les séries)
        $matieresParNiveau = DB::table('niveau_matieres')
            ->select('niveau_id', 'matiere_id')
            ->get()
            ->groupBy('niveau_id')
            ->map(fn ($rows) => $rows->pluck('matiere_id')->unique()->values()->toArray());

        // Matières par classe
        $matieresParClasse = [];
        foreach ($classes as $classe) {
            $mats = $matieresParNiveau[$classe->niveau_id] ?? [];
            if (empty($mats)) continue;
            $matieresParClasse[$classe->id] = $mats;
        }

        if (empty($matieresParClasse)) {
            $this->command->warn('Aucune matière trouvée dans niveau_matieres — seed du template exécuté ?');
            return;
        }

        // ── Étape 1 : nombre d'enseignants nécessaires par matière ───────────
        // 1 enseignant pour au plus 7 classes → ceil(nbClasses / 7)

        $classesParMatiere = [];
        foreach ($matieresParClasse as $mats) {
            foreach ($mats as $mid) {
                $classesParMatiere[$mid] = ($classesParMatiere[$mid] ?? 0) + 1;
            }
        }

        $ensNeededParMatiere = [];
        foreach ($classesParMatiere as $mid => $nbClasses) {
            $ensNeededParMatiere[$mid] = max(1, (int) ceil($nbClasses / 7));
        }

        // ── Étape 2 : affectation déterministe enseignant → matières ─────────

        $ensList       = $enseignants->values()->all();
        $nbEns         = count($ensList);
        $specParEns    = [];
        $ensParMatiere = [];

        foreach ($ensList as $ens) {
            $specParEns[$ens->id] = [];
        }

        $cursor = 0;

        foreach ($ensNeededParMatiere as $mid => $nbRequis) {
            $affectes = 0;
            $essais   = 0;

            while ($affectes < $nbRequis && $essais < $nbEns * 3) {
                $ens = $ensList[$cursor % $nbEns];
                $cursor++;
                $essais++;

                if (
                    count($specParEns[$ens->id]) < 3 &&
                    !in_array($mid, $specParEns[$ens->id])
                ) {
                    $specParEns[$ens->id][]  = $mid;
                    $ensParMatiere[$mid][]   = $ens->id;
                    $affectes++;
                }
            }

            if ($affectes < $nbRequis) {
                $this->command->warn("Seulement {$affectes}/{$nbRequis} enseignants pour matière #{$mid}");
            }
        }

        // ── Étape 3 : affectation (classe × matière) → enseignant ────────────

        $classesDistinctesParEns = array_fill_keys(array_keys($specParEns), []);
        $rows = [];

        foreach ($matieresParClasse as $classeId => $matiereIds) {
            foreach ($matiereIds as $mid) {
                $candidats = $ensParMatiere[$mid] ?? [];

                usort($candidats, fn ($a, $b) =>
                    count($classesDistinctesParEns[$a] ?? []) <=>
                    count($classesDistinctesParEns[$b] ?? [])
                );

                $choisi = null;
                foreach ($candidats as $eid) {
                    if (count($classesDistinctesParEns[$eid] ?? []) < 7) {
                        $choisi = $eid;
                        break;
                    }
                }

                if ($choisi === null && !empty($candidats)) {
                    $choisi = $candidats[0];
                }

                if ($choisi === null) {
                    $tous = array_keys($specParEns);
                    usort($tous, fn ($a, $b) =>
                        count($classesDistinctesParEns[$a] ?? []) <=>
                        count($classesDistinctesParEns[$b] ?? [])
                    );
                    $choisi = $tous[0];
                }

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

        foreach (array_chunk($rows, 300) as $chunk) {
            DB::table('classe_enseignant_matiere')->insert($chunk);
        }

        $nbClassesParEns = array_map(fn ($cl) => count($cl), $classesDistinctesParEns);
        $max = !empty($nbClassesParEns) ? max($nbClassesParEns) : 0;
        $avg = count($ensList) > 0
            ? round(array_sum($nbClassesParEns) / count($ensList), 1)
            : 0;

        $this->command->info('✓ ' . count($rows) . ' affectations insérées.');
        $this->command->info("  → max classes distinctes/enseignant : {$max}, moyenne : {$avg}");
    }
}
