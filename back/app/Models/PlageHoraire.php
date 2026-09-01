<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Une plage de la grille horaire de l'établissement (cf. chantier EDT — Lot 0.2).
 */
class PlageHoraire extends Model
{
    protected $table = 'plages_horaires';

    protected $fillable = [
        'annee_scolaire_id', 'libelle', 'jour', 'ordre',
        'heure_debut', 'heure_fin', 'type', 'actif',
    ];

    protected $casts = ['actif' => 'boolean'];

    public const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    public const TYPES = ['cours', 'recreation', 'pause_midi'];

    public function anneeScolaire()
    {
        return $this->belongsTo(AnneeScolaire::class, 'annee_scolaire_id');
    }

    public function scopeCours($query)
    {
        return $query->where('type', 'cours');
    }

    public function scopeActives($query)
    {
        return $query->where('actif', true);
    }

    /**
     * Plages applicables à un jour donné : celles marquées pour ce jour
     * plus celles valables « tous les jours ouvrés » (jour = null).
     */
    public function scopePourJour($query, string $jour)
    {
        return $query->where(fn ($q) => $q->where('jour', $jour)->orWhereNull('jour'));
    }

    public function getDureeMinutesAttribute(): int
    {
        return (int) ((strtotime($this->heure_fin) - strtotime($this->heure_debut)) / 60);
    }
}
