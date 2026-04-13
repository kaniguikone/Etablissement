<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Eleve extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        "matricule_eleve", "nom_eleve", "prenoms_eleve", "date_naissance_eleve",
        "genre_eleve", "lieu_naissance_eleve", "nationalite_eleve", "adresse_eleve",
        "photo_eleve", "classe_id", "parent_id", "statut_eleve",
    ];

    protected $casts = [
        'date_naissance_eleve' => 'date',
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

    public function parents()
    {
        return $this->belongsTo(Parents::class, 'parent_id');
    }

    public function paiements()
    {
        return $this->hasMany(Paiement::class);
    }

    /** @deprecated Use parents() */
    public function parent()
    {
        return $this->parents();
    }
}
