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
                'permissions' => array_diff($toutesPermissions, ['utilisateurs']),
                'super'       => false,
            ],
            [
                'nom'         => 'censeur',
                'label'       => 'Censeur / Adjoint pédagogique',
                'permissions' => ['eleves', 'enseignants', 'parents', 'pedagogie', 'communication'],
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
                'permissions' => ['finances'],
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
        $comptes = [
            ['name' => 'Super Administrateur', 'telephone' => '0700000001', 'email' => 'admin@etablissement.ci',      'role' => 'super_admin', 'password' => 'admin123'],
            ['name' => 'Directeur Général',    'telephone' => '0700000002', 'email' => 'directeur@etablissement.ci',  'role' => 'directeur',   'password' => 'directeur123'],
            ['name' => 'Censeur Principal',    'telephone' => '0700000003', 'email' => 'censeur@etablissement.ci',    'role' => 'censeur',     'password' => 'censeur123'],
            ['name' => 'Secrétaire',           'telephone' => '0700000004', 'email' => 'secretaire@etablissement.ci', 'role' => 'secretaire',  'password' => 'secretaire123'],
            ['name' => 'Comptable',            'telephone' => '0700000005', 'email' => 'comptable@etablissement.ci',  'role' => 'comptable',   'password' => 'comptable123'],
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
