<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CentralEnseignantLink extends Model
{
    protected $connection = 'mysql';
    protected $table      = 'central_enseignant_links';

    protected $fillable = [
        'central_user_id', 'tenant_id', 'local_enseignant_id', 'statut',
    ];

    public function centralUser(): BelongsTo
    {
        return $this->belongsTo(CentralUser::class);
    }
}
