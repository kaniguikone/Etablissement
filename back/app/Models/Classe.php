<?php

namespace App\Models;

use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Classe extends Model
{
    use HasFactory;

    public function eleves()
    {
        return $this->hasMany(Eleve::class);
    }
    
    public function niveau()
    {
        return $this->belongsTo(Niveau::class);
    }

    public function enseignants()
    {
        return $this->belongsToMany(Enseignant::class);
    }

    public function matieres()
    {
        return $this->belongsToMany(Enseignant::class);
    }
}
