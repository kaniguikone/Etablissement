<?php

namespace Database\Seeders;

use App\Models\Eleve;
use App\Models\Paiement;
use App\Models\Scolarites;
use Illuminate\Database\Seeder;

/**
 * Génère des paiements réalistes.
 *
 * - 65 % des élèves ont au moins un paiement enregistré
 * - Chaque élève payeur règle 1 à 3 échéances
 * - 80 % paiements complets, 20 % partiels
 * - Modes : espèces (60 %), virement (25 %), chèque (10 %), autre (5 %)
 */
class PaiementSeeder extends Seeder
{
    private const MODES = [
        'especes'  => 60,
        'virement' => 25,
        'cheque'   => 10,
        'autre'    => 5,
    ];

    private const DATES_PAIEMENT = [
        '2024-10-03', '2024-10-10', '2024-10-20',
        '2024-11-04', '2024-11-12', '2024-11-25',
        '2024-12-02', '2024-12-10',
        '2025-01-08', '2025-01-20',
        '2025-02-03', '2025-02-18',
        '2025-03-05',
    ];

    public function run(): void
    {
        $eleves    = Eleve::with('classe.niveau')->get();
        $scolarites = Scolarites::all()->groupBy('niveau_id');

        if ($eleves->isEmpty() || $scolarites->isEmpty()) {
            $this->command->warn('Élèves ou scolarités manquants.');
            return;
        }

        $totalPaiements = 0;

        foreach ($eleves as $eleve) {
            // 65 % des élèves ont des paiements
            if (rand(1, 100) > 65) continue;

            $niveauId = $eleve->classe?->niveau_id;
            if (!$niveauId) continue;

            $echeances = $scolarites[$niveauId] ?? collect();
            if ($echeances->isEmpty()) continue;

            $nbPaiements      = rand(1, min(3, $echeances->count()));
            $echeancesChoisies = $echeances->shuffle()->take($nbPaiements);

            foreach ($echeancesChoisies as $echeance) {
                $montantDu = (float) $echeance->montant_echeance;

                // 80 % paiement complet, 20 % partiel
                if (rand(1, 100) <= 80) {
                    $montantPaye = $montantDu;
                } else {
                    $montantPaye = round($montantDu * (rand(30, 80) / 100), -3);
                    $montantPaye = max(1000, $montantPaye);
                }

                Paiement::create([
                    'eleve_id'           => $eleve->id,
                    'scolarite_id'       => $echeance->id,
                    'montant_paye'       => $montantPaye,
                    'date_paiement'      => self::DATES_PAIEMENT[array_rand(self::DATES_PAIEMENT)],
                    'mode_paiement'      => $this->modePaiement(),
                    'reference_paiement' => 'PAI-' . strtoupper(substr(uniqid(), -6)),
                    'remarque'           => null,
                ]);
                $totalPaiements++;
            }
        }

        $this->command->info("✓ {$totalPaiements} paiements créés.");
    }

    private function modePaiement(): string
    {
        $rand = rand(1, 100);
        $cumul = 0;
        foreach (self::MODES as $mode => $pct) {
            $cumul += $pct;
            if ($rand <= $cumul) return $mode;
        }
        return 'especes';
    }
}
