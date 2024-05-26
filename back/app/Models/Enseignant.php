<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enseignant extends Model
{
    use HasFactory;

    protected $fillable = ["matricule_enseignant","nom_enseignant","prenoms_enseignant"];

    public function matieres()
    {
        return $this->belongsToMany(Matiere::class);
    }

    public function classes()
    {
        return $this->belongsToMany(Classe::class);
    }
}
