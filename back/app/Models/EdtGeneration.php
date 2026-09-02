<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Un scénario d'emploi du temps produit par le générateur (chantier EDT — Lot 2).
 */
class EdtGeneration extends Model
{
    protected $table = 'edt_generations';

    protected $fillable = [
        'libelle', 'annee_scolaire_id', 'statut', 'parametres',
        'score', 'diagnostic', 'duree_ms', 'created_by',
    ];

    protected $casts = [
        'parametres' => 'array',
        'diagnostic' => 'array',
        'score' => 'integer',
        'duree_ms' => 'integer',
    ];

    public const STATUTS = ['en_cours', 'termine', 'echec', 'publie', 'archive'];

    public function creneaux()
    {
        return $this->hasMany(EmploiDuTemps::class, 'generation_id')->withoutGlobalScope('officiel');
    }

    public function anneeScolaire()
    {
        return $this->belongsTo(AnneeScolaire::class, 'annee_scolaire_id');
    }
}
