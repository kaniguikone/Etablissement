<?php

namespace App\Models;

use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Classe extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'num_classe', 'nom_classe', 'abbr_classe', 'niveau_id',
        'salle_classe', 'effectif_max_classe', 'professeur_principal_id',
    ];

    public function eleves()
    {
        return $this->hasMany(Eleve::class);
    }

    public function niveau()
    {
        return $this->belongsTo(Niveau::class);
    }

    public function professeurPrincipal()
    {
        return $this->belongsTo(Enseignant::class, 'professeur_principal_id');
    }

    public function enseignants()
    {
        return $this->belongsToMany(Enseignant::class, 'classe_enseignant_matiere');
    }

    public function matieres()
    {
        return $this->belongsToMany(Matiere::class, 'classe_enseignant_matiere');
    }
}
