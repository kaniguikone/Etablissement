<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Classe;
use App\Models\Matiere;

/**
 * Peuple la table emploi_du_temps.
 *
 * Stratégie :
 * - 12 matières réparties sur 6 jours (lundi→samedi)
 * - Chaque jour : 2 créneaux matin + 2 l'après-midi (sauf samedi : 2 matin)
 * - L'enseignant est récupéré depuis classe_enseignant_matiere
 *
 * Utilisation : php artisan db:seed --class=EmploiDuTempsSeeder
 */
class EmploiDuTempsSeeder extends Seeder
{
    // Créneaux horaires : [ [heure_debut, heure_fin], ... ]
    private const SLOTS = [
        'lundi'    => [['08:00', '10:00'], ['10:00', '12:00'], ['14:00', '16:00'], ['16:00', '18:00']],
        'mardi'    => [['08:00', '10:00'], ['10:00', '12:00'], ['14:00', '16:00'], ['16:00', '18:00']],
        'mercredi' => [['08:00', '10:00'], ['10:00', '12:00'], ['14:00', '16:00'], ['16:00', '18:00']],
        'jeudi'    => [['08:00', '10:00'], ['10:00', '12:00'], ['14:00', '16:00'], ['16:00', '18:00']],
        'vendredi' => [['08:00', '10:00'], ['10:00', '12:00'], ['14:00', '16:00'], ['16:00', '18:00']],
        'samedi'   => [['08:00', '10:00'], ['10:00', '12:00']],
    ];

    public function run(): void
    {
        $classes  = Classe::all();
        $matieres = Matiere::all();

        if ($classes->isEmpty() || $matieres->isEmpty()) {
            $this->command->warn('Classes ou matières manquantes.');
            return;
        }

        // Récupérer les affectations enseignant par (classe, matière)
        $affectations = DB::table('classe_enseignant_matiere')
            ->get()
            ->groupBy(fn ($r) => $r->classe_id . '_' . $r->matiere_id)
            ->map(fn ($g) => $g->first()->enseignant_id);

        if ($affectations->isEmpty()) {
            $this->command->warn('Lance ClasseEnseignantMatiereSeeder d\'abord.');
            return;
        }

        DB::table('emploi_du_temps')->truncate();

        // Préparer les slots à plat : [jour => [[debut, fin], ...]]
        $slotsParJour = self::SLOTS;
        $totalSlots   = array_sum(array_map('count', $slotsParJour));

        $rows = [];

        foreach ($classes as $classe) {
            // Mélanger les matières pour varier la répartition entre classes
            $matieresIds = $matieres->pluck('id')->shuffle()->values();
            $nbMatieres  = $matieresIds->count();
            $cursor      = 0;

            foreach ($slotsParJour as $jour => $slots) {
                foreach ($slots as [$debut, $fin]) {
                    $matiereId    = $matieresIds[$cursor % $nbMatieres];
                    $affectKey    = $classe->id . '_' . $matiereId;
                    $enseignantId = $affectations->get($affectKey);

                    if (!$enseignantId) {
                        $cursor++;
                        continue;
                    }

                    $rows[] = [
                        'classe_id'     => $classe->id,
                        'matiere_id'    => $matiereId,
                        'enseignant_id' => $enseignantId,
                        'jour'          => $jour,
                        'heure_debut'   => $debut,
                        'heure_fin'     => $fin,
                    ];
                    $cursor++;
                }
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('emploi_du_temps')->insert($chunk);
        }

        $this->command->info("✓ " . count($rows) . " créneaux insérés pour {$classes->count()} classes.");
    }
}
