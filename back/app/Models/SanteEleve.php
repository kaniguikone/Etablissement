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

    protected $casts = [
        'groupe_sanguin'            => 'encrypted',
        'allergies'                 => 'encrypted',
        'medecin_nom'               => 'encrypted',
        'medecin_telephone'         => 'encrypted',
        'contact_urgence_nom'       => 'encrypted',
        'contact_urgence_lien'      => 'encrypted',
        'contact_urgence_telephone' => 'encrypted',
        'assurance_compagnie'       => 'encrypted',
        'assurance_numero_police'   => 'encrypted',
    ];

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }
}
