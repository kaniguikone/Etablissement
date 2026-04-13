<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Progression extends Model
{
    protected $table = 'progressions';

    protected $fillable = [
        'chapitre_id', 'classe_id', 'enseignant_id',
        'periode_id', 'date_seance', 'statut', 'observations',
    ];

    public function chapitre()
    {
        return $this->belongsTo(ChapitreMatiere::class, 'chapitre_id');
    }

    public function classe()
    {
        return $this->belongsTo(Classe::class);
    }

    public function enseignant()
    {
        return $this->belongsTo(Enseignant::class);
    }

    public function periode()
    {
        return $this->belongsTo(Periodes::class);
    }
}
