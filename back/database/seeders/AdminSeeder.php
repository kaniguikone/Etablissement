<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $toutesPermissions = array_keys(Role::PERMISSIONS);

        // ── Création des rôles ────────────────────────────────────────────────
        $roles = [
            [
                'nom'         => 'super_admin',
                'label'       => 'Super Administrateur',
                'permissions' => $toutesPermissions,
                'super'       => true,
            ],
            [
                'nom'         => 'directeur',
                'label'       => 'Directeur / Proviseur',
                // Liste explicite (comme les autres rôles ci-dessous) plutôt qu'un raccourci
                // "toutes sauf X" : une future permission ajoutée à Role::PERMISSIONS ne doit
                // jamais se retrouver accordée ici par accident (ex. budget_validation, qui
                // reste un pouvoir distinct de budget_gestion — cf. docs/chantier-budget.md).
                'permissions' => [
                    'parametrage', 'inscriptions', 'eleves', 'sante', 'enseignants', 'parents',
                    'pedagogie_saisie', 'pedagogie_pilotage', 'finances_caisse', 'finances_gestion',
                    'communication', 'budget_gestion',
                ],
                'super'       => false,
            ],
            [
                'nom'         => 'direction_generale',
                'label'       => 'Direction Générale (établissement autonome)',
                'permissions' => ['budget_validation'],
                'super'       => false,
            ],
            [
                'nom'         => 'censeur',
                'label'       => 'Censeur / Adjoint pédagogique',
                'permissions' => ['eleves', 'enseignants', 'parents', 'pedagogie_saisie', 'pedagogie_pilotage', 'communication'],
                'super'       => false,
            ],
            [
                'nom'         => 'secretaire',
                'label'       => 'Secrétaire',
                'permissions' => ['inscriptions', 'eleves', 'enseignants', 'parents', 'communication'],
                'super'       => false,
            ],
            [
                'nom'         => 'comptable',
                'label'       => 'Comptable',
                'permissions' => ['finances_caisse', 'finances_gestion'],
                'super'       => false,
            ],
        ];

        foreach ($roles as $r) {
            Role::updateOrCreate(['nom' => $r['nom']], [
                'label'       => $r['label'],
                'permissions' => $r['permissions'],
                'super'       => $r['super'],
                'actif'       => true,
            ]);
        }

        // ── Création des comptes de test ──────────────────────────────────────
        $domaine = (tenancy()->tenant?->id ?? 'etablissement') . '.ci';

        $comptes = [
            ['name' => 'Super Administrateur', 'telephone' => '0700000001', 'email' => "admin@{$domaine}",       'role' => 'super_admin', 'password' => 'admin123'],
            ['name' => 'Directeur Général',    'telephone' => '0700000002', 'email' => "directeur@{$domaine}",   'role' => 'directeur',   'password' => 'directeur123'],
            ['name' => 'Direction Générale',   'telephone' => '0700000006', 'email' => "direction@{$domaine}",   'role' => 'direction_generale', 'password' => 'direction123'],
            ['name' => 'Censeur Principal',    'telephone' => '0700000003', 'email' => "censeur@{$domaine}",     'role' => 'censeur',     'password' => 'censeur123'],
            ['name' => 'Secrétaire',           'telephone' => '0700000004', 'email' => "secretaire@{$domaine}",  'role' => 'secretaire',  'password' => 'secretaire123'],
            ['name' => 'Comptable',            'telephone' => '0700000005', 'email' => "comptable@{$domaine}",   'role' => 'comptable',   'password' => 'comptable123'],
        ];

        foreach ($comptes as $compte) {
            $role = Role::where('nom', $compte['role'])->first();
            User::updateOrCreate(
                ['email' => $compte['email']],
                [
                    'name'      => $compte['name'],
                    'telephone' => $compte['telephone'],
                    'role_id'   => $role?->id,
                    'actif'     => true,
                    'password'  => Hash::make($compte['password']),
                ]
            );
        }
    }
}
