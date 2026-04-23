<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Periodes extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $casts = [
        'date_debut' => 'date:Y-m-d',
        'date_fin'   => 'date:Y-m-d',
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
