<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Créneau où un enseignant ne peut pas / préfère ne pas assurer de cours
 * (cf. chantier EDT — Lot 0.5).
 */
class EnseignantIndisponibilite extends Model
{
    protected $table = 'enseignant_indisponibilites';

    protected $fillable = [
        'enseignant_id', 'annee_scolaire_id', 'plage_horaire_id',
        'jour', 'heure_debut', 'heure_fin', 'type', 'motif',
    ];

    public const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    public const TYPES = ['bloquant', 'preference'];

    public function enseignant()
    {
        return $this->belongsTo(Enseignant::class);
    }

    public function plageHoraire()
    {
        return $this->belongsTo(PlageHoraire::class, 'plage_horaire_id');
    }
}
