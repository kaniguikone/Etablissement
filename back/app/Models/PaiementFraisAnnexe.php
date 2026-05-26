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
    ];

    protected $casts = [
        'montant_paye'  => 'float',
        'date_paiement' => 'date',
    ];

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }

    public function fraisAnnexe()
    {
        return $this->belongsTo(FraisAnnexe::class);
    }
}
