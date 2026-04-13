<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvenementCalendrier extends Model
{
    protected $table = 'evenements_calendrier';

    protected $fillable = [
        'titre', 'description', 'date_debut', 'date_fin',
        'type', 'couleur', 'classe_id',
    ];

    protected function casts(): array
    {
        return [
            'date_debut' => 'date',
            'date_fin'   => 'date',
        ];
    }

    public function classe()
    {
        return $this->belongsTo(Classe::class);
    }
}
