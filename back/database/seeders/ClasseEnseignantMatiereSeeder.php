<?php

namespace Database\Seeders;

use App\Models\Classe;
use App\Models\Enseignant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Règles :
 * - Chaque enseignant a exactement 1 matière de spécialité (hors EDHC).
 * - Les spécialités sont distribuées en round-robin sur tous les enseignants.
 * - L'EDHC n'a pas de prof dédié : n'importe quel enseignant peut l'assurer
 *   (affecté en round-robin sur l'ensemble des enseignants).
 */
class ClasseEnseignantMatiereSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('classe_enseignant_matiere')->truncate();

        $classes     = Classe::orderBy('niveau_id')->orderBy('id')->get();
        $enseignants = Enseignant::all()->values();

        if ($classes->isEmpty() || $enseignants->isEmpty()) {
            $this->command->warn('Données manquantes (classes ou enseignants absents).');
            return;
        }

        // Matières par niveau depuis niveau_matieres
        $matieresParNiveau = DB::table('niveau_matieres')
            ->select('niveau_id', 'matiere_id')
            ->get()
            ->groupBy('niveau_id')
            ->map(fn ($rows) => $rows->pluck('matiere_id')->unique()->values()->toArray());

        // Matières par classe
        $matieresParClasse = [];
        foreach ($classes as $classe) {
            $mats = $matieresParNiveau[$classe->niveau_id] ?? [];
            if (!empty($mats)) {
                $matieresParClasse[$classe->id] = $mats;
            }
        }

        if (empty($matieresParClasse)) {
            $this->command->warn('Aucune matière trouvée dans niveau_matieres.');
            return;
        }

        // ID de la matière EDHC (pas de spécialiste dédié)
        $edhcId = DB::table('matieres')->where('abbr_matiere', 'EDHC')->value('id');

        // Toutes les matières non-EDHC présentes dans les classes
        $matieresNonEdhc = collect($matieresParClasse)
            ->flatten()->unique()
            ->filter(fn ($mid) => $mid !== $edhcId)
            ->values()->toArray();

        // ── Étape 1 : 1 spécialité par enseignant (round-robin) ──────────────

        $nbEns      = count($enseignants);
        $nbMatieres = count($matieresNonEdhc);
        $specialite = []; // enseignant_id => matiere_id

        for ($i = 0; $i < $nbEns; $i++) {
            $specialite[$enseignants[$i]->id] = $matieresNonEdhc[$i % $nbMatieres];
        }

        // Index inverse : matiere_id => [enseignant_ids]
        $ensParMatiere = [];
        foreach ($specialite as $ensId => $mid) {
            $ensParMatiere[$mid][] = $ensId;
        }

        // ── Étape 2 : affectation (classe × matière) → enseignant ────────────

        $chargeParEns = array_fill_keys($enseignants->pluck('id')->toArray(), 0);
        $ensIds       = $enseignants->pluck('id')->toArray();
        $edhcCursor   = 0;
        $rows         = [];

        foreach ($matieresParClasse as $classeId => $matiereIds) {
            foreach ($matiereIds as $mid) {

                if ($mid === $edhcId) {
                    // EDHC : round-robin sur tous les enseignants
                    $choisi = $ensIds[$edhcCursor % $nbEns];
                    $edhcCursor++;
                } else {
                    // Spécialité : le prof de cette matière le moins chargé
                    $candidats = $ensParMatiere[$mid] ?? [];

                    if (empty($candidats)) {
                        // Sécurité : le moins chargé de tous
                        asort($chargeParEns);
                        $choisi = array_key_first($chargeParEns);
                    } else {
                        usort($candidats, fn ($a, $b) => $chargeParEns[$a] <=> $chargeParEns[$b]);
                        $choisi = $candidats[0];
                    }
                }

                $chargeParEns[$choisi]++;
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

        $max = !empty($chargeParEns) ? max($chargeParEns) : 0;
        $avg = $nbEns > 0 ? round(array_sum($chargeParEns) / $nbEns, 1) : 0;

        $this->command->info('✓ ' . count($rows) . ' affectations insérées.');
        $this->command->info("  → max classes/enseignant : {$max}, moyenne : {$avg}");
    }
}
