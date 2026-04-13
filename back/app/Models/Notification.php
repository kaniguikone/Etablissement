<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'owner_type',
        'owner_id',
        'type',
        'titre',
        'corps',
        'data',
        'lu_le',
    ];

    protected function casts(): array
    {
        return [
            'data'  => 'array',
            'lu_le' => 'datetime',
        ];
    }

    public function getEstLuAttribute(): bool
    {
        return $this->lu_le !== null;
    }

    protected $appends = ['est_lu'];

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopePour($query, string $ownerType, int $ownerId)
    {
        return $query->where('owner_type', $ownerType)->where('owner_id', $ownerId);
    }

    public function scopeNonLues($query)
    {
        return $query->whereNull('lu_le');
    }
}
