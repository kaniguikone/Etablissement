<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class CentralUser extends Model
{
    // Toujours sur la DB centrale, même depuis un contexte tenant
    protected $connection = 'mysql';
    protected $table      = 'central_users';

    protected $fillable = ['telephone', 'nom', 'prenom', 'password'];
    protected $hidden   = ['password'];
    protected $casts    = ['password' => 'hashed'];

    public function parentLinks()
    {
        return $this->hasMany(CentralParentLink::class);
    }

    public function parentLinksActifs()
    {
        return $this->hasMany(CentralParentLink::class)
            ->where('statut', 'actif')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    public function enseignantLinks()
    {
        return $this->hasMany(CentralEnseignantLink::class);
    }

    public function enseignantLinksActifs()
    {
        return $this->hasMany(CentralEnseignantLink::class)
            ->where('statut', 'actif');
    }

    // ── Méthodes de service ───────────────────────────────────────────────────

    /**
     * Crée ou retrouve l'identité centrale d'un parent et met à jour le lien local.
     * N'crée PAS le CentralParentLink (nécessite le matricule, géré dans le contrôleur).
     */
    public static function lierParent(Parents $parent): self
    {
        $central = static::firstOrCreate(
            ['telephone' => $parent->numero_parent],
            [
                'nom'      => $parent->nom_parent    ?? '',
                'prenom'   => $parent->prenom_parent ?? '',
                'password' => $parent->password,      // déjà hashé
            ]
        );

        if ($parent->central_user_id !== $central->id) {
            $parent->updateQuietly(['central_user_id' => $central->id]);
        }

        return $central;
    }

    /**
     * Crée ou retrouve l'identité centrale d'un enseignant,
     * met à jour le lien local et crée le CentralEnseignantLink.
     */
    public static function lierEnseignant(Enseignant $enseignant, string $tenantId): self
    {
        $central = static::firstOrCreate(
            ['telephone' => $enseignant->telephone_enseignant],
            [
                'nom'      => $enseignant->nom_enseignant      ?? '',
                'prenom'   => $enseignant->prenoms_enseignant  ?? '',
                'password' => $enseignant->password,            // déjà hashé
            ]
        );

        if ($enseignant->central_user_id !== $central->id) {
            $enseignant->updateQuietly(['central_user_id' => $central->id]);
        }

        CentralEnseignantLink::firstOrCreate(
            ['central_user_id' => $central->id, 'tenant_id' => $tenantId],
            ['local_enseignant_id' => $enseignant->id, 'statut' => 'actif']
        );

        return $central;
    }

    /**
     * Crée le lien parent→élève dans la table centrale.
     */
    public static function ajouterEnfant(
        self   $central,
        string $tenantId,
        string $matricule,
        string $paymentMode = 'parent_self_pay',
    ): CentralParentLink {
        return CentralParentLink::firstOrCreate(
            [
                'central_user_id' => $central->id,
                'tenant_id'       => $tenantId,
                'matricule_eleve' => strtoupper(trim($matricule)),
            ],
            [
                'statut'       => 'en_attente',
                'payment_mode' => $paymentMode,
            ]
        );
    }
}
