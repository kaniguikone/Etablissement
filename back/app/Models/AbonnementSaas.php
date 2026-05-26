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
        'tenant_id', 'plan', 'periode', 'date_debut', 'date_fin',
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

    /** Plans disponibles avec leur configuration tarifaire. */
    public const PLANS = [
        'demo'    => [
            'label'       => 'Démo',
            'color'       => 'secondary',
            'prix_mensuel'=> 0,
            'prix_annuel' => 0,
            'max_eleves'  => 60,
            'max_classes' => 2,
            'description' => '30 jours d\'essai gratuit',
        ],
        'basic'   => [
            'label'       => 'Starter',
            'color'       => 'info',
            'prix_mensuel'=> 25000,
            'prix_annuel' => 270000,
            'max_eleves'  => 200,
            'max_classes' => 5,
            'description' => 'Jusqu\'à 5 classes, 200 élèves',
        ],
        'pro'     => [
            'label'       => 'Pro',
            'color'       => 'primary',
            'prix_mensuel'=> 45000,
            'prix_annuel' => 486000,
            'max_eleves'  => 600,
            'max_classes' => 20,
            'description' => 'Jusqu\'à 20 classes, 600 élèves',
        ],
        'premium' => [
            'label'       => 'Premium',
            'color'       => 'warning',
            'prix_mensuel'=> 75000,
            'prix_annuel' => 810000,
            'max_eleves'  => null,
            'max_classes' => null,
            'description' => 'Illimité + support prioritaire',
        ],
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
