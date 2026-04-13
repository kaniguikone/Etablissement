<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['nom', 'label', 'permissions', 'super', 'actif'];

    protected $casts = [
        'permissions' => 'array',
        'super'       => 'boolean',
        'actif'       => 'boolean',
    ];

    // Liste complète des permissions disponibles dans l'application
    const PERMISSIONS = [
        'parametrage'   => 'Paramétrage (niveaux, classes, matières, périodes, types de devoirs)',
        'inscriptions'  => 'Gestion des inscriptions',
        'eleves'        => 'Gestion des élèves',
        'enseignants'   => 'Gestion des enseignants',
        'parents'       => 'Gestion des parents',
        'pedagogie'     => 'Pédagogie (devoirs, notes, présences, emploi du temps, bulletins)',
        'finances'      => 'Finances (scolarités, paiements)',
        'communication' => 'Communication (informations)',
        'utilisateurs'  => 'Gestion des utilisateurs et des rôles',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function aPermission(string $permission): bool
    {
        if ($this->super) return true;
        return in_array($permission, $this->permissions ?? []);
    }
}
