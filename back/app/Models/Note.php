<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasFactory, Auditable;

    public $timestamps = false;

    protected $fillable = ['note', 'eleve_id', 'devoir_id'];

    protected $casts = ['note' => 'float'];

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }

    public function devoir()
    {
        return $this->belongsTo(Devoir::class);
    }
}
