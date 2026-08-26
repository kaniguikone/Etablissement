<?php

namespace App\Http\Controllers\API;

use App\Exceptions\CinetPayException;
use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\FraisAnnexe;
use App\Models\Paiement;
use App\Models\Scolarites;
use App\Services\CinetPayService;
use Illuminate\Http\Request;

class CinetPayController extends Controller
{
    public function __construct(private CinetPayService $cinetpay) {}

    /**
     * Initier un paiement CinetPay pour une échéance de scolarité (back-office).
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

        try {
            $result = $this->cinetpay->demarrerPaiement($eleve, $scolarite, $request->input('montant'), $request->return_url);
        } catch (CinetPayException $e) {
            return response()->json(['message' => 'Erreur CinetPay : ' . $e->getMessage()], 502);
        }

        return response()->json($result);
    }

    /**
     * Initier un paiement CinetPay pour un frais annexe (back-office).
     * POST /api/paiements-frais-annexes/initier
     */
    public function initierFraisAnnexe(Request $request)
    {
        $request->validate([
            'eleve_id'        => 'required|exists:eleves,id',
            'frais_annexe_id' => 'required|exists:frais_annexes,id',
            'montant'         => 'nullable|numeric|min:1',
            'return_url'      => 'required|string',
        ]);

        $eleve = Eleve::findOrFail($request->eleve_id);
        $frais = FraisAnnexe::findOrFail($request->frais_annexe_id);

        try {
            $result = $this->cinetpay->demarrerPaiement($eleve, $frais, $request->input('montant'), $request->return_url);
        } catch (CinetPayException $e) {
            return response()->json(['message' => 'Erreur CinetPay : ' . $e->getMessage()], 502);
        }

        return response()->json($result);
    }

    /**
     * Webhook appelé par CinetPay après paiement (scolarité ou frais annexe).
     * POST /api/paiements/notify  (route publique)
     */
    public function notify(Request $request)
    {
        $transactionId = $request->input('cpm_trans_id');
        if (!$transactionId) return response('OK');

        $paiement = $this->cinetpay->trouverParTransaction($transactionId);
        if (!$paiement) return response('OK');

        $this->cinetpay->rafraichirStatut($paiement);

        return response('OK');
    }

    /**
     * Vérifier le statut d'un paiement (scolarité ou frais annexe).
     * GET /api/paiements/statut/{transaction_id}
     */
    public function statut(string $transactionId)
    {
        $paiement = $this->cinetpay->trouverParTransaction($transactionId);
        abort_if(!$paiement, 404);

        $paiement->load($paiement instanceof Paiement ? ['eleve', 'scolarite'] : ['eleve', 'fraisAnnexe']);

        $etaitPending = $paiement->statut_cinetpay === 'pending';
        $this->cinetpay->rafraichirStatut($paiement);
        if ($etaitPending) $paiement->refresh();

        return response()->json($paiement);
    }
}
