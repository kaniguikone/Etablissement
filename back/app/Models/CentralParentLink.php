<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CentralParentLink extends Model
{
    protected $connection = 'mysql';
    protected $table      = 'central_parent_links';

    protected $fillable = [
        'central_user_id', 'tenant_id', 'matricule_eleve',
        'statut', 'payment_mode', 'montant', 'expires_at', 'paid_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'paid_at'    => 'datetime',
        'montant'    => 'float',
    ];

    public function centralUser(): BelongsTo
    {
        return $this->belongsTo(CentralUser::class);
    }

    public function isActif(): bool
    {
        return $this->statut === 'actif'
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
