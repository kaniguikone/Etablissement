<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class SanteEleve extends Model
{
    use Auditable;

    protected $fillable = [
        'eleve_id', 'groupe_sanguin', 'allergies', 'medecin_nom', 'medecin_telephone',
        'contact_urgence_nom', 'contact_urgence_lien', 'contact_urgence_telephone',
        'assurance_compagnie', 'assurance_numero_police',
    ];

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }
}
