<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps  = false;
    const CREATED_AT    = 'created_at';
    const UPDATED_AT    = null;

    protected $fillable = [
        'user_id',
        'user_nom',
        'action',
        'auditable_type',
        'auditable_id',
        'old_values',
        'new_values',
        'ip_address',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    public static function enregistrer(
        string $action,
        Model  $model,
        ?array $old,
        ?array $new
    ): void {
        $user = auth()->user();
        if (!$user) {
            return; // Ne pas tracer les actions système sans utilisateur connecté
        }

        static::create([
            'user_id'        => $user->id,
            'user_nom'       => $user->name,
            'action'         => $action,
            'auditable_type' => class_basename($model),
            'auditable_id'   => $model->getKey(),
            'old_values'     => $old ?: null,
            'new_values'     => $new ?: null,
            'ip_address'     => request()->ip(),
        ]);
    }
}
