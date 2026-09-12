<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class GroupAdmin extends Authenticatable
{
    use HasApiTokens;

    protected $connection = 'mysql';
    protected $table = 'group_admins';

    // Catalogue des permissions de groupe. Ne démarre qu'avec budget_validation
    // (chantier budget) ; ecoles/statistiques pourront y être ajoutées plus tard
    // pour couvrir GroupTenantController/GroupDashboardController si le besoin
    // de granularité s'étend au-delà du budget.
    const PERMISSIONS = [
        'budget_validation' => 'Budget — validation des demandes de dotation des établissements du groupe',
    ];

    protected $fillable = [
        'group_id',
        'nom',
        'email',
        'password',
        'super',
        'permissions',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password'    => 'hashed',
        'super'       => 'boolean',
        'permissions' => 'array',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /** Vérifie si ce GroupAdmin possède au moins une des permissions données */
    public function peutFaire(string|array $permissions): bool
    {
        if ($this->super) return true;

        $liste = is_array($permissions) ? $permissions : [$permissions];
        foreach ($liste as $p) {
            if (in_array($p, $this->permissions ?? [])) return true;
        }
        return false;
    }
}
