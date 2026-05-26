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
        'date_paiement' => 'date',
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
}
