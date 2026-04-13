<?php

namespace Database\Seeders;

use App\Models\Eleve;
use App\Models\Paiement;
use App\Models\Scolarites;
use Illuminate\Database\Seeder;

/**
 * S'assure qu'il existe des paiements dans tous les modes de paiement
 * et avec des références variées, pour pouvoir tester les reçus PDF.
 *
 * Crée un paiement représentatif par mode (espèces, chèque, virement, autre)
 * sur des élèves différents.
 */
class RecuPaiementSeeder extends Seeder
{
    public function run(): void
    {
        $scolarites = Scolarites::all()->groupBy('niveau_id');
        $total = 0;

        $modes = [
            [
                'mode'       => 'especes',
                'reference'  => null,
                'remarque'   => 'Remis en espèces au caissier',
                'date'       => '2024-10-03',
            ],
            [
                'mode'       => 'cheque',
                'reference'  => 'CHQ-2024-00142',
                'remarque'   => 'Chèque Banque Atlantique n° 00142',
                'date'       => '2024-11-04',
            ],
            [
                'mode'       => 'virement',
                'reference'  => 'VIR-ECOBANK-20241105',
                'remarque'   => 'Virement Ecobank — reçu confirmé',
                'date'       => '2024-11-05',
            ],
            [
                'mode'       => 'autre',
                'reference'  => 'MOB-MONEY-2024-5538',
                'remarque'   => 'Paiement via Orange Money',
                'date'       => '2024-12-02',
            ],
        ];

        // Prendre 4 élèves distincts
        $eleves = Eleve::with('classe.niveau')
            ->inRandomOrder()
            ->take(count($modes))
            ->get();

        foreach ($eleves as $index => $eleve) {
            $modeInfo = $modes[$index];
            $niveauId = $eleve->classe?->niveau_id;
            if (!$niveauId) continue;

            $echeances = $scolarites[$niveauId] ?? collect();
            if ($echeances->isEmpty()) continue;

            // Choisir une échéance pas encore soldée
            $echeanceDispo = $echeances->first(function ($ec) use ($eleve) {
                $dejaPaye = Paiement::where('eleve_id', $eleve->id)
                    ->where('scolarite_id', $ec->id)
                    ->sum('montant_paye');
                return $dejaPaye < $ec->montant_echeance;
            });

            if (!$echeanceDispo) continue;

            Paiement::create([
                'eleve_id'           => $eleve->id,
                'scolarite_id'       => $echeanceDispo->id,
                'montant_paye'       => $echeanceDispo->montant_echeance,
                'date_paiement'      => $modeInfo['date'],
                'mode_paiement'      => $modeInfo['mode'],
                'reference_paiement' => $modeInfo['reference'],
                'remarque'           => $modeInfo['remarque'],
            ]);

            $this->command->info(
                "  Reçu [{$modeInfo['mode']}] — {$eleve->nom_eleve} {$eleve->prenoms_eleve} — {$echeanceDispo->montant_echeance} FCFA"
            );
            $total++;
        }

        $this->command->info("✓ {$total} paiements représentatifs créés pour tester les reçus PDF.");
    }
}
