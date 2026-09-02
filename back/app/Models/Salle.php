<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Salle extends Model
{
    protected $fillable = ['nom', 'capacite', 'type', 'batiment', 'actif'];

    protected $casts = ['actif' => 'boolean'];

    public function creneaux()
    {
        return $this->hasMany(EmploiDuTemps::class);
    }

    /** Classes dont c'est la salle attitrée. */
    public function classesAttitrees()
    {
        return $this->hasMany(Classe::class);
    }

    public function scopeActives($query)
    {
        return $query->where('actif', true);
    }
}
