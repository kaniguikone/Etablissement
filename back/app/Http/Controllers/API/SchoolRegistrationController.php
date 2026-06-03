<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Etablissement;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SchoolRegistrationController extends Controller
{
    public function inscrire(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom_etablissement' => 'required|string|max:255',
            'type'              => 'required|in:lycee,lycee_complet,college,primaire',
            'code_ministere'    => 'required|string|max:50',
            'nom_responsable'   => 'required|string|max:255',
            'email'             => 'required|email|max:255',
            'password'          => 'required|string|min:8|confirmed',
            'telephone'         => 'nullable|string|max:30',
            'ville'             => 'nullable|string|max:100',
        ]);

        $baseId  = Str::slug($data['nom_etablissement'], '-');
        $id      = $this->uniqueTenantId($baseId);
        $domaine = $id . '.' . config('app.tenant_domain', 'localhost');

        // Vérifie que l'email n'est pas déjà utilisé comme contact d'un tenant
        if (Tenant::where('email_contact', $data['email'])->exists()) {
            return response()->json([
                'message' => 'Un établissement est déjà associé à cet email.',
                'errors'  => ['email' => ['Cet email est déjà utilisé.']],
            ], 422);
        }

        // Le code MENET devient l'identifiant de lookup — il doit être unique
        $code = strtoupper(trim($data['code_ministere']));
        if (Tenant::where('code', $code)->exists()) {
            return response()->json([
                'message' => 'Ce code MENET est déjà enregistré dans le système.',
                'errors'  => ['code_ministere' => ['Ce code est déjà utilisé par un autre établissement.']],
            ], 422);
        }

        // Création du tenant → déclenche automatiquement CreateDatabase + MigrateDatabase
        $tenant = new Tenant();
        $tenant->id              = $id;
        $tenant->nom             = $data['nom_etablissement'];
        $tenant->code            = $code;
        $tenant->email_contact   = $data['email'];
        $tenant->telephone       = $data['telephone'] ?? null;
        $tenant->ville           = $data['ville'] ?? null;
        $tenant->plan            = 'demo';
        $tenant->date_expiration = now()->addDays(30);
        $tenant->actif           = true;
        $tenant->save();

        $tenant->domains()->create(['domain' => $domaine]);

        // Initialiser le contexte tenant pour créer les rôles, l'admin et les infos établissement
        tenancy()->initialize($tenant);

        // Peupler la fiche établissement dans la base tenant
        Etablissement::create([
            'nom'            => $data['nom_etablissement'],
            'type'           => $data['type'],
            'code_ministere' => $data['code_ministere'],
            'ville'          => $data['ville'] ?? null,
            'telephone'      => $data['telephone'] ?? null,
            'pays'           => "Côte d'Ivoire",
        ]);

        $this->creerRoles();

        $role = Role::where('nom', 'super_admin')->first();
        User::create([
            'name'      => $data['nom_responsable'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'role_id'   => $role?->id,
            'telephone' => $data['telephone'] ?? null,
            'actif'     => true,
        ]);

        tenancy()->end();

        return response()->json([
            'message'    => 'Votre établissement a été créé avec succès.',
            'domaine'    => $domaine,
            'email'      => $data['email'],
            'expire_le'  => now()->addDays(30)->format('d/m/Y'),
            'code'       => $code,
        ], 201);
    }

    private function uniqueTenantId(string $base): string
    {
        $id      = $base;
        $counter = 2;
        while (Tenant::find($id)) {
            $id = "{$base}-{$counter}";
            $counter++;
        }
        return $id;
    }

    private function creerRoles(): void
    {
        $toutesPermissions = array_keys(Role::PERMISSIONS);

        $roles = [
            ['nom' => 'super_admin',  'label' => 'Super Administrateur',      'permissions' => $toutesPermissions,                                                       'super' => true],
            ['nom' => 'directeur',    'label' => 'Directeur / Proviseur',      'permissions' => array_diff($toutesPermissions, ['utilisateurs']),                         'super' => false],
            ['nom' => 'censeur',      'label' => 'Censeur / Adjoint pédagogique', 'permissions' => ['eleves', 'enseignants', 'parents', 'pedagogie_saisie', 'pedagogie_pilotage', 'communication'], 'super' => false],
            ['nom' => 'secretaire',   'label' => 'Secrétaire',                  'permissions' => ['inscriptions', 'eleves', 'enseignants', 'parents', 'communication'],   'super' => false],
            ['nom' => 'comptable',    'label' => 'Comptable',                   'permissions' => ['finances_caisse', 'finances_gestion'],                                 'super' => false],
        ];

        foreach ($roles as $r) {
            Role::updateOrCreate(
                ['nom' => $r['nom']],
                ['label' => $r['label'], 'permissions' => $r['permissions'], 'super' => $r['super'], 'actif' => true]
            );
        }
    }
}
