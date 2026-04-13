<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Niveau extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['nom_niveau', 'abbr_niveau'];

    public function classes()
    {
        return $this->hasMany(Classe::class);
    }

    public function scolarites()
    {
        return $this->hasMany(Scolarites::class);
    }
}
