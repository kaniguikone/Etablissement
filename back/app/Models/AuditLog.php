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
            'user_nom'       => static::nomAffichable($user),
            'action'         => $action,
            'auditable_type' => class_basename($model),
            'auditable_id'   => $model->getKey(),
            'old_values'     => $old ?: null,
            'new_values'     => $new ?: null,
            'ip_address'     => request()->ip(),
        ]);
    }

    /**
     * Nom affichable de l'utilisateur audité. Le modèle User (staff) a un
     * attribut 'name' ; Parents et Enseignant n'en ont pas (nom_parent/nom_enseignant
     * + prénom séparés) — d'où ce repli générique plutôt que de planter sur user_nom.
     */
    private static function nomAffichable($user): string
    {
        if (isset($user->name)) {
            return $user->name;
        }
        if (isset($user->nom_parent)) {
            return trim(($user->prenom_parent ?? '') . ' ' . $user->nom_parent);
        }
        if (isset($user->nom_enseignant)) {
            return trim(($user->prenoms_enseignant ?? '') . ' ' . $user->nom_enseignant);
        }

        return class_basename($user) . ' #' . $user->id;
    }
}
