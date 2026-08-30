<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupModule extends Model
{
    // Base centrale (pas tenant)
    protected $connection = 'mysql';

    protected $fillable = ['group_id', 'module_id', 'actif'];

    protected $casts = [
        'actif' => 'boolean',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }
}
