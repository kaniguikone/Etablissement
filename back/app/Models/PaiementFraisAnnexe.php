<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class PaiementFraisAnnexe extends Model
{
    use Auditable;

    protected $table = 'paiements_frais_annexes';

    protected $fillable = [
        'eleve_id', 'frais_annexe_id', 'montant_paye',
        'date_paiement', 'mode_paiement', 'reference_paiement', 'remarque',
        'transaction_id', 'statut_cinetpay', 'payment_url',
    ];

    protected $casts = [
        'montant_paye'  => 'float',
        'date_paiement' => 'date:Y-m-d',
    ];

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }

    public function fraisAnnexe()
    {
        return $this->belongsTo(FraisAnnexe::class);
    }

    /**
     * Exclut les tentatives de paiement CinetPay non abouties (pending/failed).
     * Un paiement manuel (statut_cinetpay = null) est toujours considéré confirmé.
     */
    public function scopeConfirmes($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('statut_cinetpay')->orWhere('statut_cinetpay', 'paid');
        });
    }
}
