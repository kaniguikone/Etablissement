<?php

namespace App\Services;

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
