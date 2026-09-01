<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class EmploiDuTemps extends Model
{
    public $timestamps = false;

    protected $table = 'emploi_du_temps';

    protected $fillable = [
        'classe_id',
        'matiere_id',
        'enseignant_id',
        'salle_id',
        'plage_horaire_id',
        'generation_id',
        'verrouille',
        'jour',
        'heure_debut',
        'heure_fin',
        'annee_scolaire_id',
    ];

    protected $casts = ['verrouille' => 'boolean'];

    /**
     * Par défaut, on ne voit que l'EDT officiel (generation_id NULL) : les
     * scénarios du générateur (chantier EDT — Lot 2) restent invisibles des
     * portails et des écrans existants. Utiliser withoutGlobalScope('officiel')
     * pour manipuler un scénario.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('officiel', fn (Builder $q) => $q->whereNull($q->getModel()->getTable().'.generation_id'));
    }

    public function classe()
    {
        return $this->belongsTo(Classe::class);
    }

    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }

    public function enseignant()
    {
        return $this->belongsTo(Enseignant::class);
    }

    public function salle()
    {
        return $this->belongsTo(Salle::class);
    }

    public function plageHoraire()
    {
        return $this->belongsTo(PlageHoraire::class, 'plage_horaire_id');
    }

    public function generation()
    {
        return $this->belongsTo(EdtGeneration::class, 'generation_id');
    }
}
