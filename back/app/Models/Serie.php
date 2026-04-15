<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Serie extends Model
{
    protected $table = 'series';

    protected $fillable = ['nom', 'description'];

    public function classes()
    {
        return $this->hasMany(Classe::class);
    }
}
