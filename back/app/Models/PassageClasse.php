<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PassageClasse extends Model
{
    protected $fillable = [
        'annee_scolaire_id',
        'eleve_id',
        'classe_actuelle_id',
        'classe_suivante_id',
        'decision',
        'remarque',
        'applique',
    ];

    protected function casts(): array
    {
        return ['applique' => 'boolean'];
    }

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }

    public function classeActuelle()
    {
        return $this->belongsTo(Classe::class, 'classe_actuelle_id');
    }

    public function classeSuivante()
    {
        return $this->belongsTo(Classe::class, 'classe_suivante_id');
    }

    public function anneeScolaire()
    {
        return $this->belongsTo(AnneeScolaire::class);
    }
}
