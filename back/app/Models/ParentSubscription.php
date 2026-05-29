<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentSubscription extends Model
{
    protected $table = 'parent_subscriptions';

    protected $fillable = [
        'eleve_id', 'statut', 'payment_mode', 'montant',
        'paid_by', 'expires_at', 'paid_at', 'reference_paiement', 'transaction_id',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'paid_at'    => 'datetime',
        'montant'    => 'float',
    ];

    public function eleve(): BelongsTo
    {
        return $this->belongsTo(Eleve::class);
    }

    public function payeur(): BelongsTo
    {
        return $this->belongsTo(Parents::class, 'paid_by');
    }

    public function isActif(): bool
    {
        return $this->statut === 'actif'
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
