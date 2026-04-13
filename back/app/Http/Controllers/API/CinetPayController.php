<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Paiement;
use App\Models\Scolarites;
use App\Services\CinetPayService;
use Illuminate\Http\Request;

class CinetPayController extends Controller
{
    public function __construct(private CinetPayService $cinetpay) {}

    /**
     * Initier un paiement CinetPay.
     * POST /api/paiements/initier
     */
    public function initier(Request $request)
    {
        $request->validate([
            'eleve_id'     => 'required|exists:eleves,id',
            'scolarite_id' => 'required|exists:scolarites,id',
            'montant'      => 'nullable|numeric|min:1',
            'return_url'   => 'required|string',
        ]);

        $eleve     = Eleve::findOrFail($request->eleve_id);
        $scolarite = Scolarites::findOrFail($request->scolarite_id);

        $montant       = $request->input('montant', $scolarite->montant_echeance);
        $transactionId = 'SCOL-' . strtoupper(substr(uniqid(), -8)) . '-' . time();

        // Enregistrer le paiement en attente
        $paiement = Paiement::create([
            'eleve_id'        => $eleve->id,
            'scolarite_id'    => $scolarite->id,
            'montant_paye'    => $montant,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'autre',
            'reference_paiement' => $transactionId,
            'transaction_id'  => $transactionId,
            'statut_cinetpay' => 'pending',
        ]);

        $result = $this->cinetpay->initierPaiement([
            'transaction_id'  => $transactionId,
            'amount'          => (int) $montant,
            'description'     => "Scolarité : {$scolarite->libelle_echeance} — {$eleve->nom_eleve} {$eleve->prenoms_eleve}",
            'return_url'      => $request->return_url . '?transaction_id=' . $transactionId,
            'notify_url'      => url('/api/paiements/notify'),
            'customer_name'   => $eleve->nom_eleve,
            'customer_surname' => $eleve->prenoms_eleve,
        ]);

        if (($result['code'] ?? '') !== '201') {
            $paiement->delete();
            return response()->json([
                'message' => 'Erreur CinetPay : ' . ($result['message'] ?? 'Inconnue'),
            ], 502);
        }

        $paymentUrl = $result['data']['payment_url'];
        $paiement->update(['payment_url' => $paymentUrl]);

        return response()->json([
            'payment_url'    => $paymentUrl,
            'transaction_id' => $transactionId,
        ]);
    }

    /**
     * Webhook appelé par CinetPay après paiement.
     * POST /api/paiements/notify  (route publique)
     */
    public function notify(Request $request)
    {
        $transactionId = $request->input('cpm_trans_id');
        if (!$transactionId) return response('OK');

        $paiement = Paiement::where('transaction_id', $transactionId)->first();
        if (!$paiement) return response('OK');

        $result = $this->cinetpay->verifierPaiement($transactionId);
        $statut = $result['data']['status'] ?? '';

        if ($statut === 'ACCEPTED') {
            $paiement->update([
                'statut_cinetpay' => 'paid',
                'date_paiement'   => now()->toDateString(),
            ]);
        } elseif (in_array($statut, ['REFUSED', 'CANCELLED', 'EXPIRED'])) {
            $paiement->update(['statut_cinetpay' => 'failed']);
        }

        return response('OK');
    }

    /**
     * Vérifier le statut d'un paiement.
     * GET /api/paiements/statut/{transaction_id}
     */
    public function statut(string $transactionId)
    {
        $paiement = Paiement::where('transaction_id', $transactionId)
            ->with(['eleve', 'scolarite'])
            ->firstOrFail();

        // Si encore en attente, interroger CinetPay
        if ($paiement->statut_cinetpay === 'pending') {
            $result = $this->cinetpay->verifierPaiement($transactionId);
            $statut = $result['data']['status'] ?? '';

            if ($statut === 'ACCEPTED') {
                $paiement->update(['statut_cinetpay' => 'paid']);
            } elseif (in_array($statut, ['REFUSED', 'CANCELLED', 'EXPIRED'])) {
                $paiement->update(['statut_cinetpay' => 'failed']);
            }
            $paiement->refresh();
        }

        return response()->json($paiement);
    }
}
