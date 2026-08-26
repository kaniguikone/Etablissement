<?php

namespace App\Console\Commands;

use App\Models\Paiement;
use App\Models\Tenant;
use App\Services\CinetPayService;
use Illuminate\Console\Command;

/**
 * Relance la vérification CinetPay des paiements restés 'pending'.
 *
 * Un paiement reste 'pending' quand le webhook /paiements/notify n'est jamais
 * reçu (ex. le parent ferme le navigateur avant redirection) et que personne
 * ne revient déclencher /paiements/statut manuellement depuis l'app.
 */
class ReconcilierPaiementsCinetPay extends Command
{
    protected $signature = 'cinetpay:reconcilier {--minutes=30 : Âge minimum (en minutes) des paiements pending à vérifier}';

    protected $description = "Vérifie auprès de CinetPay le statut des paiements restés 'pending' et met à jour leur statut";

    public function handle(CinetPayService $cinetpay): int
    {
        $seuil = now()->subMinutes((int) $this->option('minutes'));
        $totalVerifies = 0;
        $totalMisAJour = 0;

        foreach (Tenant::all() as $tenant) {
            tenancy()->initialize($tenant);

            $paiements = Paiement::where('statut_cinetpay', 'pending')
                ->where('updated_at', '<', $seuil)
                ->get();

            $misAJour = 0;
            foreach ($paiements as $paiement) {
                $result = $cinetpay->verifierPaiement($paiement->transaction_id);
                $statut = $result['data']['status'] ?? '';

                if ($statut === 'ACCEPTED') {
                    $paiement->update(['statut_cinetpay' => 'paid']);
                    $misAJour++;
                } elseif (in_array($statut, ['REFUSED', 'CANCELLED', 'EXPIRED'])) {
                    $paiement->update(['statut_cinetpay' => 'failed']);
                    $misAJour++;
                }
            }

            if ($paiements->isNotEmpty()) {
                $this->line("Tenant {$tenant->id} : {$paiements->count()} paiement(s) pending vérifié(s), {$misAJour} mis à jour.");
            }

            $totalVerifies += $paiements->count();
            $totalMisAJour += $misAJour;

            tenancy()->end();
        }

        $this->info("Terminé : {$totalVerifies} paiement(s) vérifié(s), {$totalMisAJour} mis à jour.");

        return 0;
    }
}
