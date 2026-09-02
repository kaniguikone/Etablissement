<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Sous-ensemble d'une classe suivant une matière avec un enseignant distinct
 * (LV2, dédoublement) — chantier EDT, Lot 4.
 */
class GroupePedagogique extends Model
{
    protected $table = 'groupes_pedagogiques';

    protected $fillable = [
        'classe_id', 'matiere_id', 'enseignant_id', 'libelle',
        'parallele_code', 'effectif', 'nb_seances', 'duree_minutes', 'semaine',
    ];

    protected $casts = [
        'effectif' => 'integer',
        'nb_seances' => 'integer',
        'duree_minutes' => 'integer',
    ];

    public function classe()
    {
        return $this->belongsTo(Classe::class);
    }

    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }

    public function enseignant()
    {
        return $this->belongsTo(Enseignant::class);
    }
}
