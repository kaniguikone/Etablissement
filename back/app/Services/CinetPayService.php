<?php

namespace App\Services;

use App\Exceptions\CinetPayException;
use App\Models\Eleve;
use App\Models\FraisAnnexe;
use App\Models\Paiement;
use App\Models\PaiementFraisAnnexe;
use App\Models\Scolarites;
use Illuminate\Support\Facades\Http;

class CinetPayService
{
    private string $apiKey;
    private string $siteId;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey  = config('services.cinetpay.api_key', '');
        $this->siteId  = config('services.cinetpay.site_id', '');
        $this->baseUrl = config('services.cinetpay.base_url', 'https://api-checkout.cinetpay.com/v2');
    }

    /**
     * Crée un paiement 'pending' pour une échéance de scolarité ou un frais annexe,
     * puis initie la transaction CinetPay. Lance une RuntimeException si CinetPay refuse
     * (le paiement 'pending' est alors supprimé).
     *
     * @return array{payment_url: string, transaction_id: string}
     */
    public function demarrerPaiement(Eleve $eleve, Scolarites|FraisAnnexe $payable, ?float $montant, string $returnUrl): array
    {
        $estFraisAnnexe = $payable instanceof FraisAnnexe;
        $modelClass     = $estFraisAnnexe ? PaiementFraisAnnexe::class : Paiement::class;
        $montantDefaut  = $estFraisAnnexe ? $payable->montant : $payable->montant_echeance;
        $libelle        = $estFraisAnnexe ? $payable->nom : $payable->libelle_echeance;

        $montant       = $montant ?? $montantDefaut;
        $transactionId = ($estFraisAnnexe ? 'FRAIS' : 'SCOL') . '-' . strtoupper(substr(uniqid(), -8)) . '-' . time();

        $paiement = $modelClass::create(array_merge([
            'eleve_id'            => $eleve->id,
            'montant_paye'        => $montant,
            'date_paiement'       => now()->toDateString(),
            'mode_paiement'       => 'cinetpay',
            'reference_paiement'  => $transactionId,
            'transaction_id'      => $transactionId,
            'statut_cinetpay'     => 'pending',
        ], [
            $estFraisAnnexe ? 'frais_annexe_id' : 'scolarite_id' => $payable->id,
        ]));

        $result = $this->initierPaiement([
            'transaction_id'   => $transactionId,
            'amount'           => (int) $montant,
            'description'      => ($estFraisAnnexe ? "Frais : {$libelle}" : "Scolarité : {$libelle}") . " — {$eleve->nom_eleve} {$eleve->prenoms_eleve}",
            'return_url'       => $returnUrl . '?transaction_id=' . $transactionId,
            'notify_url'       => url('/api/paiements/notify'),
            'customer_name'    => $eleve->nom_eleve,
            'customer_surname' => $eleve->prenoms_eleve,
        ]);

        if (($result['code'] ?? '') !== '201') {
            $paiement->delete();
            throw new CinetPayException($result['message'] ?? 'Erreur inconnue');
        }

        $paymentUrl = $result['data']['payment_url'];
        $paiement->update(['payment_url' => $paymentUrl]);

        return ['payment_url' => $paymentUrl, 'transaction_id' => $transactionId];
    }

    /** Retrouve un paiement CinetPay (scolarité ou frais annexe) par son transaction_id. */
    public function trouverParTransaction(string $transactionId): Paiement|PaiementFraisAnnexe|null
    {
        return Paiement::where('transaction_id', $transactionId)->first()
            ?? PaiementFraisAnnexe::where('transaction_id', $transactionId)->first();
    }

    /** Ré-interroge CinetPay et met à jour le statut si le paiement est encore 'pending'. */
    public function rafraichirStatut(Paiement|PaiementFraisAnnexe $paiement): void
    {
        if ($paiement->statut_cinetpay !== 'pending') {
            return;
        }

        $result = $this->verifierPaiement($paiement->transaction_id);
        $statut = $result['data']['status'] ?? '';

        if ($statut === 'ACCEPTED') {
            $paiement->update(['statut_cinetpay' => 'paid']);
        } elseif (in_array($statut, ['REFUSED', 'CANCELLED', 'EXPIRED'])) {
            $paiement->update(['statut_cinetpay' => 'failed']);
        }
    }

    public function initierPaiement(array $params): array
    {
        $response = Http::timeout(30)->post($this->baseUrl . '/payment', [
            'apikey'                => $this->apiKey,
            'site_id'               => $this->siteId,
            'transaction_id'        => $params['transaction_id'],
            'amount'                => (int) $params['amount'],
            'currency'              => 'XOF',
            'description'           => $params['description'],
            'return_url'            => $params['return_url'],
            'notify_url'            => $params['notify_url'],
            'channels'              => 'ALL',
            'customer_name'         => $params['customer_name'] ?? 'Parent',
            'customer_surname'      => $params['customer_surname'] ?? '',
            'customer_email'        => $params['customer_email'] ?? 'noreply@ecole.ci',
            'customer_phone_number' => $params['customer_phone'] ?? '+22500000000',
            'customer_address'      => 'Abidjan',
            'customer_city'         => 'Abidjan',
            'customer_country'      => 'CI',
            'customer_state'        => 'CI',
            'customer_zip_code'     => '00000',
        ]);

        return $response->json() ?? [];
    }

    public function verifierPaiement(string $transactionId): array
    {
        $response = Http::timeout(15)->post($this->baseUrl . '/payment/check', [
            'apikey'         => $this->apiKey,
            'site_id'        => $this->siteId,
            'transaction_id' => $transactionId,
        ]);

        return $response->json() ?? [];
    }
}
