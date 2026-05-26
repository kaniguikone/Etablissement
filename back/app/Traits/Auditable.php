<?php

namespace App\Traits;

use App\Models\AuditLog;

trait Auditable
{
    protected static function bootAuditable(): void
    {
        static::created(function ($model) {
            $fillable = array_flip($model->getFillable());
            AuditLog::enregistrer('create', $model, null, array_intersect_key($model->getAttributes(), $fillable));
        });

        static::updating(function ($model) {
            $dirty = $model->getDirty();
            if (empty($dirty)) {
                return;
            }
            $old = array_intersect_key($model->getOriginal(), $dirty);
            AuditLog::enregistrer('update', $model, $old, $dirty);
        });

        static::deleted(function ($model) {
            $fillable = array_flip($model->getFillable());
            AuditLog::enregistrer('delete', $model, array_intersect_key($model->getAttributes(), $fillable), null);
        });
    }
}
