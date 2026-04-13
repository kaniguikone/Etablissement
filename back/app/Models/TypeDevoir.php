<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TypeDevoir extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'type_devoirs';

    protected $fillable = ['code_type_devoir', 'description_type_devoir'];

    public function devoirs()
    {
        return $this->hasMany(Devoir::class);
    }
}
