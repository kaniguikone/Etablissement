<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = ['name', 'telephone', 'email', 'role_id', 'actif', 'password', 'photo'];

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo ? '/api/image/' . $this->photo : null;
    }

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'actif'             => 'boolean',
        ];
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    /** Vérifie si l'utilisateur possède au moins une des permissions données */
    public function peutFaire(string|array $permissions): bool
    {
        if (!$this->role) return false;
        if ($this->role->super) return true;

        $liste = is_array($permissions) ? $permissions : [$permissions];
        foreach ($liste as $p) {
            if ($this->role->aPermission($p)) return true;
        }
        return false;
    }

    public function estSuperAdmin(): bool
    {
        return (bool) $this->role?->super;
    }
}
