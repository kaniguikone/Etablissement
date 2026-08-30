<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    /**
     * Colonnes personnalisées stockées dans la table tenants
     * (non dans la colonne JSON 'data').
     */
    public static function getCustomColumns(): array
    {
        return [
            'id',
            'code',
            'nom',
            'email_contact',
            'telephone',
            'ville',
            'pays',
            'actif',
            'date_expiration',
            'group_id',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function abonnements(): HasMany
    {
        return $this->hasMany(AbonnementSaas::class, 'tenant_id');
    }

    /**
     * Liste des slugs de modules/sous-modules actifs pour ce tenant, ou null si
     * le catalogue n'est pas encore peuplé (migration déployée avant le seeder).
     * Résolution : override tenant > override groupe > valeur par défaut du catalogue.
     * Renvoyer null plutôt que [] dans ce cas évite de bloquer tout accès le temps
     * que ModuleSeeder tourne.
     */
    public function modulesActifs(): ?array
    {
        $modules = Module::all();
        if ($modules->isEmpty()) return null;

        $tenantOverrides = TenantModule::where('tenant_id', $this->id)->pluck('actif', 'module_id');
        $groupOverrides  = $this->group_id
            ? GroupModule::where('group_id', $this->group_id)->pluck('actif', 'module_id')
            : collect();

        return $modules
            ->filter(function (Module $m) use ($tenantOverrides, $groupOverrides) {
                if ($tenantOverrides->has($m->id)) return (bool) $tenantOverrides[$m->id];
                if ($groupOverrides->has($m->id))  return (bool) $groupOverrides[$m->id];
                return $m->actif_par_defaut;
            })
            ->pluck('slug')
            ->values()
            ->all();
    }

    public function hasModule(string $slug): bool
    {
        $actifs = $this->modulesActifs();
        return $actifs === null || in_array($slug, $actifs, true);
    }

    protected $casts = [
        'actif'           => 'boolean',
        'date_expiration' => 'date:Y-m-d',
        'data'            => 'array',
    ];

    protected $fillable = [
        'id',
        'code',
        'nom',
        'email_contact',
        'telephone',
        'ville',
        'pays',
        'actif',
        'date_expiration',
        'group_id',
    ];

    // Forcer la clé primaire en string non auto-incrémentée
    // (stancl/tenancy GeneratesIds::getIncrementing() retourne true quand
    // aucun id_generator n'est configuré, ce qui force Eloquent à caster
    // notre slug en entier 0)
    public $incrementing = false;
    protected $keyType   = 'string';

    public function getIncrementing(): bool  { return false; }
    public function getKeyType(): string     { return 'string'; }
}
