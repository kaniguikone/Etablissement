<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends Model
{
    // Base centrale (pas tenant)
    protected $connection = 'mysql';

    protected $fillable = ['slug', 'label', 'parent_id', 'ordre', 'actif_par_defaut'];

    protected $casts = [
        'actif_par_defaut' => 'boolean',
        'ordre'            => 'integer',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'parent_id');
    }

    public function enfants(): HasMany
    {
        return $this->hasMany(Module::class, 'parent_id')->orderBy('ordre');
    }
}
