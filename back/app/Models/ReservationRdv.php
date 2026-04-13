<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReservationRdv extends Model
{
    protected $table = 'reservations_rdv';

    protected $fillable = ['creneau_id', 'parent_id', 'eleve_id', 'statut', 'motif', 'note_enseignant'];

    public function creneau()
    {
        return $this->belongsTo(CreneauRdv::class, 'creneau_id');
    }

    public function parent()
    {
        return $this->belongsTo(Parents::class, 'parent_id');
    }

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }
}
