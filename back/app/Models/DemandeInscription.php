<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemandeInscription extends Model
{
    protected $table = 'demandes_inscription';

    protected $fillable = [
        'origine',
        'nom_eleve', 'prenoms_eleve', 'date_naissance_eleve', 'genre_eleve',
        'lieu_naissance_eleve', 'nationalite_eleve', 'adresse_eleve',
        'niveau_id', 'niveau_souhaite',
        'nom_parent', 'prenom_parent', 'numero_parent',
        'email_parent', 'relation_parent', 'profession_parent', 'adresse_parent',
    ];


    public function niveau()
    {
        return $this->belongsTo(Niveau::class);
    }

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }
}
