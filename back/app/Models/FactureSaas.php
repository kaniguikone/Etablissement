<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FactureSaas extends Model
{
    protected $connection = 'mysql';
    protected $table      = 'factures_saas';

    protected $fillable = [
        'reference', 'abonnement_id', 'tenant_id',
        'montant_ht', 'taux_tva', 'montant_tva', 'montant_ttc',
        'date_emission', 'date_echeance', 'statut',
    ];

    protected $casts = [
        'date_emission' => 'date',
        'date_echeance' => 'date',
        'montant_ht'    => 'float',
        'montant_tva'   => 'float',
        'montant_ttc'   => 'float',
        'taux_tva'      => 'float',
    ];

    public function abonnement(): BelongsTo
    {
        return $this->belongsTo(AbonnementSaas::class, 'abonnement_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /** Génère une référence unique de type FAC-2026-000042 */
    public static function genererReference(): string
    {
        $annee   = date('Y');
        $dernier = static::whereYear('created_at', $annee)->max('id') ?? 0;
        return 'FAC-' . $annee . '-' . str_pad($dernier + 1, 6, '0', STR_PAD_LEFT);
    }
}
