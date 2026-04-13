<?php

namespace Database\Seeders;

use App\Models\Eleve;
use App\Models\Sanction;
use Illuminate\Database\Seeder;

/**
 * Crée des sanctions de démonstration sur une sélection d'élèves.
 */
class SanctionSeeder extends Seeder
{
    public function run(): void
    {
        $eleves = Eleve::inRandomOrder()->take(20)->get();
        $total  = 0;

        $motifs = [
            ['avertissement', 'Bavardage répété en classe', null, null],
            ['avertissement', 'Retards répétés non justifiés', null, null],
            ['avertissement', 'Manque de respect envers un camarade', null, null],
            ['blame',         'Insolence envers un professeur', 'Comportement jugé inacceptable lors du cours de Mathématiques.', null],
            ['blame',         'Perturbation grave du cours', null, null],
            ['exclusion_temp','Bagarre dans la cour de récréation', 'Exclusion de 3 jours suite à altercation physique.', 3],
            ['exclusion_temp','Dégradation de matériel scolaire', 'Bureau endommagé délibérément.', 5],
            ['convocation',   'Absences non justifiées répétées', 'Convocation des parents à 14h le vendredi.', null],
            ['convocation',   'Résultats scolaires préoccupants', 'Entretien avec le conseiller pédagogique.', null],
            ['autre',         'Usage du téléphone portable en classe', null, null],
        ];

        $responsables = ['M. le Proviseur', 'Mme la Censeure', 'M. Koné (CPE)', 'Mme Bamba (CPE)'];

        foreach ($eleves as $i => $eleve) {
            $nbSanctions = rand(1, 3);
            $baseDate    = '2024-10-01';

            for ($j = 0; $j < $nbSanctions; $j++) {
                $motifData  = $motifs[array_rand($motifs)];
                [$type, $motif, $desc, $duree] = $motifData;

                $dateSanction = date('Y-m-d', strtotime($baseDate . ' +' . ($j * rand(10, 30)) . ' days'));
                $dateFin      = null;

                if ($type === 'exclusion_temp' && $duree) {
                    $dateFin = date('Y-m-d', strtotime($dateSanction . ' +' . $duree . ' days'));
                }

                // 70 % des parents sont notifiés
                $notifie = rand(1, 10) <= 7;

                Sanction::create([
                    'eleve_id'       => $eleve->id,
                    'type'           => $type,
                    'motif'          => $motif,
                    'description'    => $desc,
                    'date_sanction'  => $dateSanction,
                    'date_fin'       => $dateFin,
                    'prononcee_par'  => $responsables[array_rand($responsables)],
                    'parent_notifie' => $notifie,
                ]);
                $total++;
            }
        }

        $this->command->info("✓ {$total} sanctions créées sur " . $eleves->count() . " élèves.");
    }
}
