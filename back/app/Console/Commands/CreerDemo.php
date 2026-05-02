<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\TemplateService;
use Database\Seeders\AdminSeeder;
use Database\Seeders\CalendrierSeeder;
use Database\Seeders\ChapitresMatiereSeeder;
use Database\Seeders\ClasseEnseignantMatiereSeeder;
use Database\Seeders\DevoirNoteAssiduitesSeeder;
use Database\Seeders\EmploiDuTempsSeeder;
use Database\Seeders\EnseignantAuthSeeder;
use Database\Seeders\NotificationSeeder;
use Database\Seeders\PaiementSeeder;
use Database\Seeders\ParentAuthSeeder;
use Database\Seeders\ProgressionSeeder;
use Database\Seeders\SanctionSeeder;
use Database\Seeders\VolumeHoraireSeeder;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreerDemo extends Command
{
    protected $signature = 'demo:creer
        {--id=college-demo        : Identifiant du tenant}
        {--nom=                   : Nom affiché du tenant (défaut: dérivé de l\'id)}
        {--domaine=               : Domaine (défaut: {id}.localhost)}
        {--template=college       : Template (lycee|lycee_complet|college|primaire)}
        {--annee=2024-2025        : Année scolaire}
        {--periodes=trimestre     : trimestre ou semestre}
        {--admin-email=           : Email admin (défaut: admin@{id}.localhost)}
        {--admin-password=demo123 : Mot de passe admin}
        {--force                  : Supprime et recrée si le tenant existe déjà}';

    protected $description = 'Crée un établissement de démonstration entièrement prépeuplé';

    public function handle(): int
    {
        $id       = $this->option('id');
        $domaine  = $this->option('domaine') ?: "{$id}.localhost";
        $template = $this->option('template');
        $annee    = $this->option('annee');
        $periodes = $this->option('periodes');
        $adminEmail    = $this->option('admin-email') ?: "admin@{$id}.localhost";
        $adminPassword = $this->option('admin-password');

        // ── Nettoyage si --force ─────────────────────────────────────────────
        if ($this->option('force') && $tenant = Tenant::find($id)) {
            $this->warn("Suppression du tenant existant « {$id} »…");
            tenancy()->initialize($tenant);
            DB::connection('tenant')->getSchemaBuilder()->dropAllTables();
            tenancy()->end();
            $tenant->domains()->delete();
            $tenant->delete();
        }

        if (Tenant::find($id)) {
            $this->error("Un tenant « {$id} » existe déjà. Utilisez --force pour le recréer.");
            return 1;
        }

        // ── Création du tenant ───────────────────────────────────────────────
        $this->info("Création du tenant « {$id} »…");
        $tenant = Tenant::create([
            'id'  => $id,
            'nom' => $this->option('nom') ?: ucfirst(str_replace('-', ' ', $id)),
        ]);
        $tenant->domains()->create(['domain' => $domaine]);

        tenancy()->initialize($tenant);

        // ── Migrations ──────────────────────────────────────────────────────────
        $this->info('Migrations…');
        $this->call('tenants:migrate', ['--tenants' => [$id], '--force' => true]);
        // tenants:migrate appelle tenancy()->end() en interne — ré-initialiser
        tenancy()->initialize($tenant);

        // ── Template ────────────────────────────────────────────────────────────
        $this->info("Application du template « {$template} »…");
        $stats = app(TemplateService::class)->appliquer($id, $template, $annee, $periodes);
        $this->table(['Élément', 'Créés'], collect($stats)->map(fn($v, $k) => [str_replace('_', ' ', $k), $v])->values()->toArray());
        // TemplateService::appliquer() appelle tenancy()->end() — ré-initialiser
        tenancy()->initialize($tenant);

        // ── Rôles et comptes standards ──────────────────────────────────────
        $this->info('Création des rôles et comptes…');
        app(AdminSeeder::class)->setCommand($this)->run();

        // Compte admin personnalisé (email/password fournis en option)
        $roleAdmin = Role::where('nom', 'super_admin')->first();
        User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name'      => 'Administrateur',
                'telephone' => '0700000000',
                'role_id'   => $roleAdmin?->id,
                'actif'     => true,
                'password'  => Hash::make($adminPassword),
            ]
        );

        DB::table('etablissement')->updateOrInsert(
            ['id' => 1],
            [
                'nom'    => $this->option('nom') ?: ucwords(str_replace('-', ' ', $id)),
                'slogan' => 'L\'excellence au service de la jeunesse',
                'ville'  => 'Abidjan',
                'pays'   => 'Côte d\'Ivoire',
            ]
        );

        // ── Données réalistes ────────────────────────────────────────────────
        $this->info('Génération des données de démonstration (élèves, notes, paiements…)');

        $params = [
            'job_id'                 => Str::uuid(),
            'tenant_id'              => $id,
            'template'               => $template,
            'annee'                  => $annee,
            'periodes_type'          => $periodes,
            'classes_min'            => 2,
            'classes_max'            => 3,
            'eleves_min'             => 20,
            'eleves_max'             => 35,
            'nb_enseignants'         => 15,
            'avec_eleves'            => true,
            'avec_emploi'            => true,
            'avec_devoirs'           => true,
            'avec_paiements'         => true,
            'devoirs_min'            => 2,
            'devoirs_max'            => 3,
            'assiduites_par_periode' => 4,
        ];

        $jobDir = base_path("storage/seeder-jobs/{$params['job_id']}");
        @mkdir($jobDir, 0755, true);
        file_put_contents("{$jobDir}/params.json", json_encode($params));

        $this->call('seed:web', ['job_id' => (string) $params['job_id']]);
        // seed:web peut aussi terminer tenancy — ré-initialiser
        tenancy()->initialize($tenant);

        // ── Seeders complémentaires (instanciés directement pour rester sur la connexion tenant)
        foreach ([
            EnseignantAuthSeeder::class,
            ParentAuthSeeder::class,
            CalendrierSeeder::class,
            ChapitresMatiereSeeder::class,
            ProgressionSeeder::class,
            VolumeHoraireSeeder::class,
            SanctionSeeder::class,
            NotificationSeeder::class,
        ] as $seederClass) {
            $this->info("  → {$seederClass}…");
            app($seederClass)->setCommand($this)->run();
        }

        tenancy()->end();

        // ── Récapitulatif ────────────────────────────────────────────────────
        $this->newLine();
        $this->info('══════════════════════════════════════════════════════════');
        $this->info('  Démo créée avec succès !');
        $this->info('══════════════════════════════════════════════════════════');
        $this->table(
            ['Champ', 'Valeur'],
            [
                ['URL',            "http://{$domaine}"],
                ['Email admin',    $adminEmail],
                ['Mot de passe',   $adminPassword],
                ['Template',       $template],
                ['Année scolaire', $annee],
            ]
        );

        return 0;
    }
}
