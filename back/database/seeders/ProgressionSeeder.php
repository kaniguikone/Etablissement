<?php

namespace Database\Seeders;

use App\Models\ChapitreMatiere;
use App\Models\Periodes;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Génère des progressions réalistes pour chaque triplet (classe, matière, enseignant)
 * en simulant l'avancement naturel au fil des trimestres.
 *
 * Logique par trimestre :
 *  - T1 : chapitres 1 à ~3 couverts (début d'année)
 *  - T2 : chapitres 4 à ~6 couverts
 *  - T3 : chapitres 7+ (en cours ou reportés pour certains)
 *
 * Pour chaque chapitre "couvert", le statut est tiré aléatoirement :
 *  - 70 % fait, 15 % en_cours, 15 % reporté
 * Les statuts en_cours et reporté ont des observations obligatoires.
 */
class ProgressionSeeder extends Seeder
{
    private const OBSERVATIONS_EN_COURS = [
        'Chapitre commencé mais non terminé faute de temps.',
        'Première partie traitée, suite au prochain cours.',
        'Exercices pratiques en cours, chapitre à finaliser.',
        'Concept introduit, approfondissement prévu la semaine prochaine.',
        'La classe a besoin de plus d\'exercices — poursuite en cours.',
    ];

    private const OBSERVATIONS_REPORTE = [
        'Reporté suite à une journée pédagogique non planifiée.',
        'Reporté — cours annulé pour cause d\'absence de l\'enseignant.',
        'Chapitre reporté : les prérequis n\'étaient pas maîtrisés.',
        'Reporté suite aux évaluations de fin de trimestre.',
        'Chapitre difficile, remis à la prochaine période pour plus de temps.',
    ];

    // Dates de séance représentatives par trimestre
    private const DATES = [
        'T1' => [
            '2024-09-13', '2024-09-27', '2024-10-11',
            '2024-10-25', '2024-11-08', '2024-11-22',
            '2024-12-06', '2024-12-13',
        ],
        'T2' => [
            '2025-01-10', '2025-01-24', '2025-02-07',
            '2025-02-21', '2025-03-07',
        ],
        'T3' => [
            '2025-03-21', '2025-04-04', '2025-04-25',
            '2025-05-09', '2025-05-23',
        ],
    ];

    public function run(): void
    {
        DB::table('progressions')->truncate();

        $periodes = Periodes::all()->keyBy('code_periode');

        if ($periodes->isEmpty()) {
            $this->command->warn('Aucune période trouvée.');
            return;
        }

        // Récupérer toutes les affectations (classe × matière × enseignant)
        $affectations = DB::table('classe_enseignant_matiere')->get();

        if ($affectations->isEmpty()) {
            $this->command->warn('Aucune affectation trouvée — lance ClasseEnseignantMatiereSeeder d\'abord.');
            return;
        }

        // Chapitres indexés par matière
        $chapitresParMatiere = ChapitreMatiere::all()
            ->sortBy('ordre')
            ->groupBy('matiere_id');

        if ($chapitresParMatiere->isEmpty()) {
            $this->command->warn('Aucun chapitre trouvé — lance ChapitresMatiereSeeder d\'abord.');
            return;
        }

        // Tranches de chapitres à couvrir par trimestre (index 0-based)
        // T1 : chapitres 0-2, T2 : 3-5, T3 : 6-8 (selon disponibilité)
        $tranches = [
            'T1' => [0, 2],
            'T2' => [3, 5],
            'T3' => [6, 8],
        ];

        $rows  = [];
        $total = 0;

        foreach ($affectations as $aff) {
            $chapitres = $chapitresParMatiere[$aff->matiere_id] ?? null;
            if (!$chapitres || $chapitres->isEmpty()) continue;

            $chapitresList = $chapitres->values()->all(); // tableau indexé 0-based

            foreach ($tranches as $code => [$debut, $fin]) {
                $periode = $periodes[$code] ?? null;
                if (!$periode) continue;

                $dates = self::DATES[$code];

                // Sélectionner les chapitres de cette tranche (avec bruit aléatoire ±1)
                $debut = max(0, $debut + rand(-1, 0));
                $fin   = min(count($chapitresList) - 1, $fin + rand(0, 1));

                $dateIdx = 0;
                for ($i = $debut; $i <= $fin; $i++) {
                    if (!isset($chapitresList[$i])) break;

                    $chapitre = $chapitresList[$i];
                    $tirage   = rand(1, 100);

                    if ($tirage <= 70) {
                        $statut       = 'fait';
                        $observations = null;
                    } elseif ($tirage <= 85) {
                        $statut       = 'en_cours';
                        $observations = self::OBSERVATIONS_EN_COURS[array_rand(self::OBSERVATIONS_EN_COURS)];
                    } else {
                        $statut       = 'reporte';
                        $observations = self::OBSERVATIONS_REPORTE[array_rand(self::OBSERVATIONS_REPORTE)];
                    }

                    $date = $dates[$dateIdx % count($dates)];
                    $dateIdx++;

                    $rows[] = [
                        'chapitre_id'   => $chapitre->id,
                        'classe_id'     => $aff->classe_id,
                        'enseignant_id' => $aff->enseignant_id,
                        'periode_id'    => $periode->id,
                        'date_seance'   => $date,
                        'statut'        => $statut,
                        'observations'  => $observations,
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ];
                    $total++;
                }
            }
        }

        // Insertion par lots (ignore les doublons éventuels)
        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('progressions')->insertOrIgnore($chunk);
        }

        $this->command->info("✓ $total progressions insérées.");
    }
}
