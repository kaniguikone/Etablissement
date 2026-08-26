<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Paiement extends Model
{
    use HasFactory, Auditable;

    protected $casts = [
        'montant_paye'  => 'float',
        'date_paiement' => 'date:Y-m-d',
    ];

    protected $fillable = [
        'eleve_id',
        'scolarite_id',
        'montant_paye',
        'date_paiement',
        'mode_paiement',
        'reference_paiement',
        'remarque',
        'transaction_id',
        'statut_cinetpay',
        'payment_url',
        'annee_scolaire_id',
    ];

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }

    public function scolarite()
    {
        return $this->belongsTo(Scolarites::class);
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
