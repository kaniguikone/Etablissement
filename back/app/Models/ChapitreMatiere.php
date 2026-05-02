<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChapitreMatiere extends Model
{
    protected $table = 'chapitres_matiere';

    protected $fillable = ['matiere_id', 'niveau_id', 'serie_id', 'titre', 'ordre', 'note_direction'];

    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }

    public function niveau()
    {
        return $this->belongsTo(\App\Models\Niveau::class);
    }

    public function serie()
    {
        return $this->belongsTo(\App\Models\Serie::class);
    }

    public function progressions()
    {
        return $this->hasMany(Progression::class, 'chapitre_id');
    }
}
