<?php

namespace App\Models;

use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Matiere extends Model
{
    use HasFactory;
    
    protected $fillable = ['libelle_matiere', 'description_matiere'];

    public function enseignants()
    {
        return $this->belongsToMany(Enseignant::class);
    }

    public function classes()
    {
        return $this->belongsToMany(Classe::class);
    }
}
