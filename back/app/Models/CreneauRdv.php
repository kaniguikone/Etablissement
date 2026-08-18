<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CreneauRdv extends Model
{
    protected $table = 'creneaux_rdv';

    protected $fillable = ['enseignant_id', 'date_creneau', 'heure_debut', 'heure_fin', 'actif'];

    protected $casts = ['date_creneau' => 'date:Y-m-d', 'actif' => 'boolean'];

    public function enseignant()
    {
        return $this->belongsTo(Enseignant::class);
    }

    public function reservation()
    {
        return $this->hasOne(ReservationRdv::class, 'creneau_id');
    }
}
