<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Periodes extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $casts = [
        'date_debut' => 'date',
        'date_fin'   => 'date',
    ];

    protected $fillable = [
        'libelle_periode',
        'abbr_libelle_periode',
        'code_periode',
        'annee',
        'date_debut',
        'date_fin',
        'annee_scolaire_id',
    ];

    public function anneeScolaire()
    {
        return $this->belongsTo(AnneeScolaire::class);
    }
}
