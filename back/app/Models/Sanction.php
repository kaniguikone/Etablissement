<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sanction extends Model
{
    protected $fillable = [
        'eleve_id', 'type', 'motif', 'description',
        'date_sanction', 'date_fin', 'prononcee_par', 'parent_notifie',
    ];

    protected function casts(): array
    {
        return [
            'date_sanction'   => 'date',
            'date_fin'        => 'date',
            'parent_notifie'  => 'boolean',
        ];
    }

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }
}
