<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NiveauMatiere extends Model
{
    use HasFactory;

    protected $fillable = ['niveau_id', 'matiere_id', 'groupe_alternatif_id', 'obligatoire'];

    protected $casts = ['obligatoire' => 'boolean'];

    public function matiere()     { return $this->belongsTo(Matiere::class); }
    public function niveau()      { return $this->belongsTo(Niveau::class); }
    public function groupe()      { return $this->belongsTo(GroupeAlternatif::class, 'groupe_alternatif_id'); }
}
