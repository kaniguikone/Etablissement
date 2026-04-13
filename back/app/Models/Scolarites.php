<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Scolarites extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $casts = ['montant_echeance' => 'float'];

    protected $fillable = [
        'libelle_echeance',
        'date_echeance',
        'montant_echeance',
        'niveau_id',
    ];

    public function niveau()
    {
        return $this->belongsTo(Niveau::class);
    }
}
