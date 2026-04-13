<?php

declare(strict_types=1);

namespace App\Models;

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
            'nom',
            'email_contact',
            'telephone',
            'ville',
            'pays',
            'plan',
            'actif',
            'date_expiration',
        ];
    }

    protected $casts = [
        'actif'           => 'boolean',
        'date_expiration' => 'date',
        'data'            => 'array',
    ];

    protected $fillable = [
        'id',
        'nom',
        'email_contact',
        'telephone',
        'ville',
        'pays',
        'plan',
        'actif',
        'date_expiration',
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
