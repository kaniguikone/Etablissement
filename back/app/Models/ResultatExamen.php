<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResultatExamen extends Model
{
    protected $table = 'resultats_examens';

    protected $fillable = [
        'annee_scolaire_id', 'type_examen',
        'nb_inscrits', 'nb_inscrits_filles',
        'nb_presentes', 'nb_presentes_filles',
        'nb_admis', 'nb_admis_filles',
    ];

    protected $casts = [
        'nb_inscrits'         => 'integer',
        'nb_inscrits_filles'  => 'integer',
        'nb_presentes'        => 'integer',
        'nb_presentes_filles' => 'integer',
        'nb_admis'            => 'integer',
        'nb_admis_filles'     => 'integer',
    ];

    public function anneeScolaire()
    {
        return $this->belongsTo(AnneeScolaire::class);
    }
}
