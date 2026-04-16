<?php

namespace Database\Seeders;

/**
 * DemoSeeder — Crée deux tenants de démonstration :
 *
 *  1. ecole-independante  → établissement indépendant, vide (groupe_id = null)
 *                           → montre la section "Démarrage rapide" dans Paramètres
 *
 *  2. lycee-groupe        → établissement membre du groupe "Groupe Scolaire Demo"
 *                           → montre le bandeau "Membre du groupe X" dans Paramètres
 *                           → données pré-remplies via template lycee_complet
 *
 * Usage :
 *   php artisan db:seed --class=DemoSeeder
 *
 * Comptes créés :
 *   École indépendante  → admin@ecole-independante.localhost  / demo123
 *   École dans le groupe→ admin@lycee-groupe.localhost        / demo123
 *   Admin groupe        → groupe@demo.ci                     / groupe123
 */

use App\Models\Group;
use App\Models\GroupAdmin;
use App\Models\Tenant;
use App\Services\TemplateService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // ══════════════════════════════════════════════════════════════════
        // 1. Nettoyage des démos précédentes
        // ══════════════════════════════════════════════════════════════════
        $this->nettoyer(['ecole-independante', 'lycee-groupe']);

        // ══════════════════════════════════════════════════════════════════
        // 2. Groupe de démonstration (base centrale)
        // ══════════════════════════════════════════════════════════════════
        $groupe = Group::create([
            'nom'           => 'Groupe Scolaire Demo',
            'email_contact' => 'contact@groupe-demo.ci',
            'telephone'     => '+225 27 00 00 00 00',
            'pays'          => 'Côte d\'Ivoire',
            'actif'         => true,
        ]);

        GroupAdmin::create([
            'group_id' => $groupe->id,
            'nom'      => 'Admin Groupe Demo',
            'email'    => 'groupe@demo.ci',
            'password' => Hash::make('groupe123'),
        ]);

        $this->command->info("✓ Groupe « {$groupe->nom} » créé (admin : groupe@demo.ci / groupe123)");

        // ══════════════════════════════════════════════════════════════════
        // 3. Tenant 1 — École indépendante (vide)
        // ══════════════════════════════════════════════════════════════════
        $independant = $this->creerTenant(
            id:       'ecole-independante',
            nom:      'École Indépendante Demo',
            domaine:  'ecole-independante.localhost',
            groupId:  null,
        );

        tenancy()->initialize($independant);

        $this->seederAdmin(
            email:     'admin@ecole-independante.localhost',
            password:  'demo123',
            nomEcole:  'École Indépendante Demo',
            slogan:    'Libre et autonome depuis 2024',
        );

        // Pas de données scolaires → la section "Démarrage rapide" s'affichera

        tenancy()->end();

        $this->command->info('✓ Tenant « ecole-independante » créé — vide, sans groupe');
        $this->command->line('    Login : admin@ecole-independante.localhost / demo123');

        // ══════════════════════════════════════════════════════════════════
        // 4. Tenant 2 — École membre du groupe (données pré-remplies)
        // ══════════════════════════════════════════════════════════════════
        $dansGroupe = $this->creerTenant(
            id:       'lycee-groupe',
            nom:      'Lycée Groupe Demo',
            domaine:  'lycee-groupe.localhost',
            groupId:  $groupe->id,
        );

        tenancy()->initialize($dansGroupe);

        $this->seederAdmin(
            email:     'admin@lycee-groupe.localhost',
            password:  'demo123',
            nomEcole:  'Lycée Groupe Demo',
            slogan:    'Membre du Groupe Scolaire Demo',
        );

        // Données pré-remplies via template lycee_complet
        $service = app(TemplateService::class);
        $stats = $service->appliquer('lycee-groupe', 'lycee_complet', '2025-2026', 'trimestre');

        tenancy()->end();

        $this->command->info('✓ Tenant « lycee-groupe » créé — template lycee_complet appliqué');
        $this->command->line('    Login : admin@lycee-groupe.localhost / demo123');
        $this->command->table(
            ['Élément', 'Créés'],
            collect($stats)->map(fn($v, $k) => [str_replace('_', ' ', $k), $v])->values()->toArray()
        );

        // ══════════════════════════════════════════════════════════════════
        // Récapitulatif
        // ══════════════════════════════════════════════════════════════════
        $this->command->newLine();
        $this->command->table(
            ['Cas', 'URL', 'Email', 'Mot de passe', 'Groupe'],
            [
                ['Indépendant (vide)',    'http://ecole-independante.localhost', 'admin@ecole-independante.localhost', 'demo123',    'aucun'],
                ['Dans un groupe',        'http://lycee-groupe.localhost',        'admin@lycee-groupe.localhost',        'demo123',    'Groupe Scolaire Demo'],
                ['Admin groupe',          '(domaine central)',                    'groupe@demo.ci',                      'groupe123',  '—'],
            ]
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────

    private function creerTenant(string $id, string $nom, string $domaine, ?int $groupId): Tenant
    {
        $tenant = Tenant::create([
            'id'             => $id,
            'nom'            => $nom,
            'email_contact'  => "contact@{$id}.localhost",
            'pays'           => "Côte d'Ivoire",
            'plan'           => 'pro',
            'actif'          => true,
            'group_id'       => $groupId,
            'date_expiration'=> now()->addYear(),
        ]);

        $tenant->domains()->create(['domain' => $domaine]);

        // Créer la base de données explicitement (tenants:migrate ne la crée pas)
        $prefix = config('tenancy.database.prefix', 'tenant');
        $dbName = $prefix . $id;
        DB::statement("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // Lancer les migrations tenant
        \Artisan::call('tenants:migrate', ['--tenants' => [$id], '--force' => true]);

        return $tenant;
    }

    private function seederAdmin(string $email, string $password, string $nomEcole, string $slogan): void
    {
        // Établissement
        DB::table('etablissement')->insert([
            'nom'        => $nomEcole,
            'slogan'     => $slogan,
            'pays'       => "Côte d'Ivoire",
            'ville'      => 'Abidjan',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Rôle super admin
        $roleId = DB::table('roles')->insertGetId([
            'nom'         => 'super_admin',
            'label'       => 'Super Administrateur',
            'permissions' => json_encode(['eleves', 'enseignants', 'parents', 'pedagogie',
                                         'finances', 'inscriptions', 'communication',
                                         'parametrage', 'utilisateurs']),
            'super'       => 1,
            'actif'       => 1,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        // Compte admin
        DB::table('users')->insert([
            'name'       => 'Administrateur Demo',
            'email'      => $email,
            'password'   => Hash::make($password),
            'role_id'    => $roleId,
            'actif'      => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function nettoyer(array $ids): void
    {
        $prefix = config('tenancy.database.prefix', 'tenant');

        foreach ($ids as $id) {
            $tenant = Tenant::find($id);
            if (!$tenant) continue;

            // Supprimer le domaine
            $tenant->domains()->delete();

            // Supprimer la base manuellement si elle existe
            $dbName = $prefix . $id;
            $exists = DB::select(
                "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
                [$dbName]
            );
            if ($exists) {
                DB::statement("DROP DATABASE `{$dbName}`");
            }

            // Supprimer le tenant sans déclencher les events tenancy (évite un 2ème DROP)
            \Illuminate\Support\Facades\Event::fake([
                \Stancl\Tenancy\Events\DeletingTenant::class,
                \Stancl\Tenancy\Events\TenantDeleted::class,
            ]);
            $tenant->delete();
            \Illuminate\Support\Facades\Event::clearResolvedInstances();

            $this->command->line("  ✗ Tenant « {$id} » supprimé");
        }

        // Supprimer les groupes de démo précédents
        $ancien = DB::connection('mysql')->table('groups')->where('nom', 'Groupe Scolaire Demo')->first();
        if ($ancien) {
            DB::connection('mysql')->table('group_admins')->where('group_id', $ancien->id)->delete();
            DB::connection('mysql')->table('groups')->where('id', $ancien->id)->delete();
            $this->command->line('  ✗ Groupe « Groupe Scolaire Demo » supprimé');
        }
    }
}
