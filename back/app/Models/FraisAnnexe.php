<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FraisAnnexe extends Model
{
    protected $fillable = [
        'nom', 'categorie', 'montant', 'annee',
        'niveau_id', 'obligatoire', 'description',
    ];

    protected $casts = [
        'montant'    => 'float',
        'obligatoire'=> 'boolean',
    ];

    public const CATEGORIES = [
        'tenue'    => 'Tenue scolaire',
        'manuel'   => 'Manuels scolaires',
        'apes'     => 'Cotisation APES',
        'examen'   => 'Frais d\'examen',
        'transport'=> 'Transport scolaire',
        'cantine'  => 'Cantine / Restauration',
        'activite' => 'Activité parascolaire',
        'autre'    => 'Autre',
    ];

    public function niveau()
    {
        return $this->belongsTo(Niveau::class);
    }

    public function paiements()
    {
        return $this->hasMany(PaiementFraisAnnexe::class);
    }
}
