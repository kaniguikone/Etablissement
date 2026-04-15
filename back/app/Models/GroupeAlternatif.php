<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GroupeAlternatif extends Model
{
    use HasFactory;

    protected $fillable = ['nom', 'description'];

    public function niveauMatieres()
    {
        return $this->hasMany(NiveauMatiere::class);
    }
}
