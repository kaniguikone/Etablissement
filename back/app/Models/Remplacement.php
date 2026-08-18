<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Remplacement extends Model
{
    protected $fillable = [
        'creneau_id', 'date_remplacement', 'enseignant_absent_id',
        'remplacant_id', 'statut', 'motif_absence', 'note', 'notifie_enseignant',
    ];

    protected $casts = [
        'date_remplacement' => 'date:Y-m-d',
        'notifie_enseignant' => 'boolean',
    ];

    public function creneau()
    {
        return $this->belongsTo(EmploiDuTemps::class, 'creneau_id');
    }

    public function enseignantAbsent()
    {
        return $this->belongsTo(Enseignant::class, 'enseignant_absent_id');
    }

    public function remplacant()
    {
        return $this->belongsTo(Enseignant::class, 'remplacant_id');
    }
}
