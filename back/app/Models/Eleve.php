<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Eleve extends Model
{
    use HasFactory;

    public $timestamps = false;

    // statut_eleve : actif | inactif | abandon | decede
    protected $fillable = [
        "matricule_eleve", "nom_eleve", "prenoms_eleve", "date_naissance_eleve",
        "genre_eleve", "lieu_naissance_eleve", "nationalite_eleve", "adresse_eleve",
        "photo_eleve", "classe_id", "parent_id", "statut_eleve",
        "langue2", "statut_bourse", "est_affecte",
        "types_handicap", "statut_orphelin",
    ];

    protected $casts = [
        'date_naissance_eleve' => 'date:Y-m-d',
        'est_affecte'          => 'boolean',
        'types_handicap'       => 'array',
    ];

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_eleve
            ? '/api/image/' . $this->photo_eleve
            : null;
    }

    public function classe()
    {
        return $this->belongsTo(Classe::class);
    }

    /** Parents liés via le portail (pivot eleve_parent, max 2) */
    public function parents()
    {
        return $this->belongsToMany(Parents::class, 'eleve_parent', 'eleve_id', 'parent_id')
                    ->withPivot('relation')
                    ->withTimestamps();
    }

    /** Parent unique legacy (rétrocompatibilité champ parent_id) */
    public function parentLegacy()
    {
        return $this->belongsTo(Parents::class, 'parent_id');
    }

    public function subscription()
    {
        return $this->hasOne(ParentSubscription::class)->latestOfMany();
    }

    public function paiements()
    {
        return $this->hasMany(Paiement::class);
    }
}
