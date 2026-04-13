<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Devoir extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $casts = ['coeff_devoir' => 'float'];

    protected $fillable = [
        'code_devoir',
        'date_devoir',
        'coeff_devoir',
        'type_devoir_id',
        'matiere_id',
        'classe_id',
        'niveau_id',
        'periode_id',
    ];

    public function typeDevoir()
    {
        return $this->belongsTo(TypeDevoir::class, 'type_devoir_id');
    }

    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }

    public function classe()
    {
        return $this->belongsTo(Classe::class);
    }

    public function niveau()
    {
        return $this->belongsTo(Niveau::class);
    }

    public function periode()
    {
        return $this->belongsTo(Periodes::class, 'periode_id');
    }

    public function notes()
    {
        return $this->hasMany(Note::class);
    }
}
