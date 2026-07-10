<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AbonnementSaas extends Model
{
    // Base centrale (pas tenant)
    protected $connection = 'mysql';
    protected $table      = 'abonnements_saas';

    protected $fillable = [
        'tenant_id', 'periode', 'date_debut', 'date_fin',
        'montant_ht', 'taux_tva', 'montant_ttc', 'mode_paiement',
        'reference_paiement', 'statut', 'notes', 'created_by',
    ];

    protected $casts = [
        'date_debut'   => 'date',
        'date_fin'     => 'date',
        'montant_ht'   => 'float',
        'montant_ttc'  => 'float',
        'taux_tva'     => 'float',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function facture(): HasOne
    {
        return $this->hasOne(FactureSaas::class, 'abonnement_id');
    }
}
