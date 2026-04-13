<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Parents extends Authenticatable
{
    use HasFactory, HasApiTokens;

    public $timestamps = false;

    protected $table = 'parents';

    protected $fillable = [
        'numero_parent', 'nom_parent', 'prenom_parent', 'password',
        'email_parent', 'adresse_parent', 'relation_parent', 'profession_parent',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function eleves()
    {
        return $this->hasMany(Eleve::class, 'parent_id');
    }
}
