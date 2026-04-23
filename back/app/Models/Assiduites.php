<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Assiduites extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'date_assiduite',
        'heure_debut',
        'heure_fin',
        'duree',
        'statut',
        'remarque',
        'eleve_id',
        'matiere_id',
        'periode_id',
    ];

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }

    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }

    public function periode()
    {
        return $this->belongsTo(Periodes::class, 'periode_id');
    }
}
