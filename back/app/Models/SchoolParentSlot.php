<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolParentSlot extends Model
{
    protected $table = 'school_parent_slots';

    protected $fillable = [
        'slots_achetes', 'slots_utilises', 'montant_total', 'expires_at',
    ];

    protected $casts = [
        'expires_at'   => 'datetime',
        'montant_total' => 'float',
    ];

    public function slotsDisponibles(): int
    {
        return max(0, $this->slots_achetes - $this->slots_utilises);
    }

    public function aDesSlots(): bool
    {
        return $this->slotsDisponibles() > 0;
    }
}
