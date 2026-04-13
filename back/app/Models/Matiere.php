<?php

namespace App\Models;

use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Matiere extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['abbr_matiere', 'libelle_matiere', 'description_matiere'];

    public function enseignants()
    {
        return $this->belongsToMany(Enseignant::class, 'classe_enseignant_matiere');
    }

    public function classes()
    {
        return $this->belongsToMany(Classe::class, 'classe_enseignant_matiere');
    }
}
