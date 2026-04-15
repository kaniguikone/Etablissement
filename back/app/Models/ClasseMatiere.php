<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClasseMatiere extends Model
{
    use HasFactory;

    protected $fillable = ['classe_id', 'matiere_id', 'groupe_alternatif_id'];

    public function matiere() { return $this->belongsTo(Matiere::class); }
    public function classe()  { return $this->belongsTo(Classe::class); }
    public function groupe()  { return $this->belongsTo(GroupeAlternatif::class, 'groupe_alternatif_id'); }
}
