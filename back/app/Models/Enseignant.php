<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

class Enseignant extends Authenticatable
{
    use HasFactory, HasApiTokens;

    public $timestamps = false;

    protected $fillable = [
        "matricule_enseignant", "nom_enseignant", "prenoms_enseignant",
        "genre_enseignant", "telephone_enseignant", "email_enseignant",
        "date_naissance_enseignant", "date_embauche_enseignant", "statut_enseignant",
        "password", "central_user_id",
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'password'                   => 'hashed',
        'date_naissance_enseignant'  => 'date:Y-m-d',
        'date_embauche_enseignant'   => 'date:Y-m-d',
    ];

    public function matieres()
    {
        return $this->belongsToMany(Matiere::class, 'classe_enseignant_matiere')
                    ->distinct();
    }

    public function classes()
    {
        return $this->belongsToMany(Classe::class, 'classe_enseignant_matiere')
                    ->distinct();
    }

    public function classesMatieresTable()
    {
        return DB::table('classe_enseignant_matiere')->where('enseignant_id', $this->id);
    }

    /** Créneaux d'indisponibilité (vacataires, temps partiel — cf. chantier EDT). */
    public function indisponibilites()
    {
        return $this->hasMany(EnseignantIndisponibilite::class);
    }
}
