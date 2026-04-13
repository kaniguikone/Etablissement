<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VolumeHoraire extends Model
{
    protected $table = 'volumes_horaires';

    protected $fillable = ['niveau_id', 'matiere_id', 'heures_semaine', 'semaines_annee'];

    protected $appends = ['heures_annuelles'];

    public function niveau()
    {
        return $this->belongsTo(Niveau::class);
    }

    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }

    public function getHeuresAnnuellesAttribute(): float
    {
        return round($this->heures_semaine * $this->semaines_annee, 1);
    }
}
