<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateSchool extends Command
{
    protected $signature = 'school:create
        {id : Identifiant unique (slug) ex: lycee-moderne}
        {nom : Nom complet de l\'établissement}
        {domaine : Domaine complet ex: lycee-moderne.monapp.ci}
        {--plan=demo : Plan tarifaire (demo|basic|pro)}
        {--email= : Email de contact}
        {--ville= : Ville}
        {--admin-email= : Email du premier administrateur}
        {--admin-password= : Mot de passe du premier administrateur}';

    protected $description = 'Créer un nouvel établissement (tenant) avec sa base de données';

    public function handle(): int
    {
        $id      = $this->argument('id');
        $nom     = $this->argument('nom');
        $domaine = $this->argument('domaine');

        // Valider l'ID
        if (!preg_match('/^[a-z0-9-]+$/', $id)) {
            $this->error("L'ID doit être en minuscules, chiffres et tirets uniquement.");
            return 1;
        }

        if (Tenant::find($id)) {
            $this->error("Un tenant avec l'ID '$id' existe déjà.");
            return 1;
        }

        $this->info("Création de l'établissement '$nom'...");

        $tenant = new Tenant();
        $tenant->id            = $id;
        $tenant->nom           = $nom;
        $tenant->email_contact = $this->option('email');
        $tenant->ville         = $this->option('ville');
        $tenant->plan          = $this->option('plan') ?? 'demo';
        $tenant->actif         = true;
        $tenant->save();

        $tenant->domains()->create(['domain' => $domaine]);

        $this->info("✓ Tenant créé : $id");
        $this->info("✓ Domaine configuré : $domaine");
        $this->info("✓ Base de données créée et migrée");

        // Créer l'administrateur initial si fourni
        $adminEmail    = $this->option('admin-email');
        $adminPassword = $this->option('admin-password');

        if ($adminEmail && $adminPassword) {
            // Initialiser la tenancy pour créer l'utilisateur dans la bonne DB
            tenancy()->initialize($tenant);

            \App\Models\User::create([
                'name'     => 'Administrateur',
                'email'    => $adminEmail,
                'password' => Hash::make($adminPassword),
            ]);

            tenancy()->end();

            $this->info("✓ Administrateur créé : $adminEmail");
        }

        $this->newLine();
        $this->table(
            ['Propriété', 'Valeur'],
            [
                ['ID', $id],
                ['Nom', $nom],
                ['Domaine', $domaine],
                ['Plan', $this->option('plan')],
                ['URL API', "https://$domaine/api"],
            ]
        );

        return 0;
    }
}
