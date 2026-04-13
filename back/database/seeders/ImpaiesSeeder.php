<?php

namespace Database\Seeders;

use App\Models\Eleve;
use App\Models\Paiement;
use App\Models\Scolarites;
use Illuminate\Database\Seeder;

/**
 * Crée des cas d'impayés bien visibles pour tester le tableau des impayés.
 *
 * Cas simulés :
 *  - Élèves totalement impayés (aucun paiement)
 *  - Élèves partiellement impayés (paiement insuffisant sur une ou plusieurs échéances)
 *  - Élèves avec un seul versement et le reste impayé
 *
 * Ce seeder complète PaiementSeeder sans dupliquer les paiements existants.
 */
class ImpaiesSeeder extends Seeder
{
    public function run(): void
    {
        $scolarites = Scolarites::all()->groupBy('niveau_id');
        $total = 0;

        // ── Cas 1 : 5 élèves n'ayant qu'un seul paiement partiel ─────────────
        $elevesUn = Eleve::with('classe.niveau')
            ->inRandomOrder()
            ->take(5)
            ->get();

        foreach ($elevesUn as $eleve) {
            $niveauId = $eleve->classe?->niveau_id;
            if (!$niveauId) continue;

            $echeances = $scolarites[$niveauId] ?? collect();
            if ($echeances->isEmpty()) continue;

            $premierEcheance = $echeances->first();

            // Vérifie qu'il n'y a pas déjà un paiement pour cette échéance
            $dejaPayee = Paiement::where('eleve_id', $eleve->id)
                ->where('scolarite_id', $premierEcheance->id)
                ->exists();

            if ($dejaPayee) continue;

            // Paiement partiel : 30 % du montant dû
            $montantPartiel = max(5000, round($premierEcheance->montant_echeance * 0.30, -3));

            Paiement::create([
                'eleve_id'           => $eleve->id,
                'scolarite_id'       => $premierEcheance->id,
                'montant_paye'       => $montantPartiel,
                'date_paiement'      => '2024-10-15',
                'mode_paiement'      => 'especes',
                'reference_paiement' => 'PAI-PARTIEL-' . strtoupper(substr(uniqid(), -5)),
                'remarque'           => 'Paiement partiel — reste dû',
            ]);
            $total++;
        }

        // ── Cas 2 : 5 élèves ayant payé exactement une échéance sur cinq ─────
        $elevesUneEch = Eleve::with('classe.niveau')
            ->whereDoesntHave('paiements')
            ->inRandomOrder()
            ->take(5)
            ->get();

        foreach ($elevesUneEch as $eleve) {
            $niveauId = $eleve->classe?->niveau_id;
            if (!$niveauId) continue;

            $echeances = $scolarites[$niveauId] ?? collect();
            if ($echeances->count() < 2) continue;

            // Paiement complet de la 2ème échéance seulement
            $echeance = $echeances->skip(1)->first();

            Paiement::create([
                'eleve_id'           => $eleve->id,
                'scolarite_id'       => $echeance->id,
                'montant_paye'       => $echeance->montant_echeance,
                'date_paiement'      => '2024-11-08',
                'mode_paiement'      => 'virement',
                'reference_paiement' => 'VIR-' . strtoupper(substr(uniqid(), -6)),
                'remarque'           => null,
            ]);
            $total++;
        }

        // ── Cas 3 : 3 élèves avec un gros paiement partiel (50 %) ────────────
        $elevesGros = Eleve::with('classe.niveau')
            ->whereDoesntHave('paiements')
            ->inRandomOrder()
            ->take(3)
            ->get();

        foreach ($elevesGros as $eleve) {
            $niveauId = $eleve->classe?->niveau_id;
            if (!$niveauId) continue;

            $echeances = $scolarites[$niveauId] ?? collect();
            foreach ($echeances->take(3) as $echeance) {
                $montant50 = round($echeance->montant_echeance * 0.50, -3);
                Paiement::create([
                    'eleve_id'           => $eleve->id,
                    'scolarite_id'       => $echeance->id,
                    'montant_paye'       => max(5000, $montant50),
                    'date_paiement'      => '2024-12-05',
                    'mode_paiement'      => 'cheque',
                    'reference_paiement' => 'CHQ-' . strtoupper(substr(uniqid(), -6)),
                    'remarque'           => 'Acompte 50 %',
                ]);
                $total++;
            }
        }

        $this->command->info("✓ {$total} paiements partiels/impayés créés pour le tableau des impayés.");
    }
}
