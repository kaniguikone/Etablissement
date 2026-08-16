<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EffacementTenant extends Model
{
    protected $connection = 'mysql';
    protected $table      = 'effacements_tenants';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id_original', 'nom_etablissement', 'super_admin_id', 'motif', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
