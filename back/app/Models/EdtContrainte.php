<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Une contrainte de confection d'emploi du temps (chantier EDT — Lot 1).
 */
class EdtContrainte extends Model
{
    protected $table = 'edt_contraintes';

    protected $fillable = ['code', 'libelle', 'nature', 'active', 'poids', 'parametres'];

    protected $casts = [
        'active' => 'boolean',
        'poids' => 'integer',
        'parametres' => 'array',
    ];

    public function scopeActives($query)
    {
        return $query->where('active', true);
    }
}
