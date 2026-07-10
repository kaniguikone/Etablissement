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
        'central_user_id',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'password' => 'hashed',
    ];

    /** Enfants liés via le portail (pivot eleve_parent) */
    public function eleves()
    {
        return $this->belongsToMany(Eleve::class, 'eleve_parent', 'parent_id', 'eleve_id')
                    ->withPivot('relation')
                    ->withTimestamps();
    }

    /** Enfants liés via l'ancien champ parent_id (rétrocompatibilité) */
    public function elevesLegacy()
    {
        return $this->hasMany(Eleve::class, 'parent_id');
    }

    public function subscriptions()
    {
        return $this->hasMany(ParentSubscription::class, 'paid_by');
    }
}
