<?php

namespace App\Models;

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
        'jour',
        'heure_debut',
        'heure_fin',
        'annee_scolaire_id',
    ];

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
}
