<?php

namespace Database\Seeders;

use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\VolumeHoraire;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Volumes horaires hebdomadaires par niveau et matière.
 * Basé sur le programme officiel ivoirien (MENA).
 *
 * Clé : abbr_niveau => [ abbr_matiere => heures/semaine ]
 */
class VolumeHoraireSeeder extends Seeder
{
    private const VOLUMES = [
        '6ième' => [
            'MATH' => 5.0, 'FR'   => 6.0, 'ANG'  => 3.0,
            'SVT'  => 2.0, 'HG'   => 2.0, 'SPC'  => 2.0,
            'EPS'  => 2.0, 'MUSQ' => 1.0, 'AP'   => 1.0,
        ],
        '5ième' => [
            'MATH' => 5.0, 'FR'   => 5.0, 'ANG'  => 3.0,
            'SVT'  => 2.0, 'HG'   => 2.0, 'SPC'  => 2.0,
            'EPS'  => 2.0, 'MUSQ' => 1.0, 'AP'   => 1.0,
        ],
        '4ième' => [
            'MATH' => 5.0, 'FR'   => 5.0, 'ANG'  => 3.0,
            'SVT'  => 2.0, 'HG'   => 2.0, 'SPC'  => 3.0,
            'EPS'  => 2.0, 'MUSQ' => 1.0, 'AP'   => 1.0,
            'ALL'  => 2.0, 'ESP'  => 2.0,
        ],
        '3ième' => [
            'MATH' => 5.0, 'FR'   => 5.0, 'ANG'  => 3.0,
            'SVT'  => 2.0, 'HG'   => 3.0, 'SPC'  => 3.0,
            'EPS'  => 2.0, 'MUSQ' => 1.0, 'AP'   => 1.0,
            'ALL'  => 2.0, 'ESP'  => 2.0,
        ],
        '2nde' => [
            'MATH' => 5.0, 'FR'   => 4.0, 'ANG'  => 3.0,
            'SVT'  => 3.0, 'HG'   => 3.0, 'SPC'  => 4.0,
            'EPS'  => 2.0, 'MUSQ' => 1.0, 'AP'   => 1.0,
            'ALL'  => 2.0, 'ESP'  => 2.0,
        ],
        '1ère' => [
            'MATH' => 5.0, 'FR'   => 4.0, 'ANG'  => 3.0,
            'SVT'  => 3.0, 'HG'   => 2.0, 'SPC'  => 4.0,
            'EPS'  => 2.0, 'PHI'  => 2.0,
            'ALL'  => 2.0, 'ESP'  => 2.0,
        ],
        'Tle'  => [
            'MATH' => 5.0, 'FR'   => 3.0, 'ANG'  => 3.0,
            'SVT'  => 3.0, 'HG'   => 2.0, 'SPC'  => 4.0,
            'EPS'  => 2.0, 'PHI'  => 3.0,
            'ALL'  => 2.0, 'ESP'  => 2.0,
        ],
    ];

    public function run(): void
    {
        DB::table('volumes_horaires')->truncate();

        $niveaux  = Niveau::all()->keyBy('abbr_niveau');
        $matieres = Matiere::all()->keyBy('abbr_matiere');
        $total    = 0;

        foreach (self::VOLUMES as $abbrNiveau => $lignes) {
            $niveau = $niveaux[$abbrNiveau] ?? null;
            if (!$niveau) {
                $this->command->warn("Niveau $abbrNiveau introuvable.");
                continue;
            }

            foreach ($lignes as $abbrMatiere => $heures) {
                $matiere = $matieres[$abbrMatiere] ?? null;
                if (!$matiere) continue;

                VolumeHoraire::create([
                    'niveau_id'      => $niveau->id,
                    'matiere_id'     => $matiere->id,
                    'heures_semaine' => $heures,
                    'semaines_annee' => 36,
                ]);
                $total++;
            }
        }

        $this->command->info("✓ $total volumes horaires créés.");
    }
}
