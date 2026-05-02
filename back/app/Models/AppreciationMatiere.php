<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppreciationMatiere extends Model
{
    protected $table = 'appreciations_matiere';

    protected $fillable = ['eleve_id', 'matiere_id', 'periode_id', 'appreciation', 'enseignant_id'];

    public function eleve()    { return $this->belongsTo(Eleve::class); }
    public function matiere()  { return $this->belongsTo(Matiere::class); }
    public function periode()  { return $this->belongsTo(Periodes::class); }
    public function enseignant() { return $this->belongsTo(Enseignant::class); }
}
