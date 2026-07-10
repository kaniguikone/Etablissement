<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\TemplateService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateSchool extends Command
{
    protected $signature = 'school:create
        {id : Identifiant unique (slug) ex: lycee-moderne}
        {nom : Nom complet de l\'établissement}
        {domaine : Domaine complet ex: lycee-moderne.monapp.ci}
        {--email= : Email de contact}
        {--ville= : Ville}
        {--group-id= : ID du groupe auquel rattacher l\'établissement (optionnel)}
        {--admin-email= : Email du premier administrateur}
        {--admin-password= : Mot de passe du premier administrateur}
        {--type= : Type d\'établissement pour pré-remplissage (lycee, lycee_complet, college, primaire)}
        {--annee= : Année scolaire du pré-remplissage, ex: 2025-2026 (défaut : année courante)}
        {--periodes=trimestre : Type de périodes du pré-remplissage (trimestre ou semestre)}';

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

        $type = $this->option('type');
        if ($type && !array_key_exists($type, TemplateService::liste())) {
            $this->error("Type invalide '$type'. Valeurs possibles : " . implode(', ', array_keys(TemplateService::liste())) . '.');
            return 1;
        }

        $this->info("Création de l'établissement '$nom'...");

        $groupId = $this->option('group-id') ? (int) $this->option('group-id') : null;

        if ($groupId && !\App\Models\Group::find($groupId)) {
            $this->error("Aucun groupe trouvé avec l'ID $groupId.");
            return 1;
        }

        $code = $this->generateUniqueCode();

        $tenant = new Tenant();
        $tenant->id            = $id;
        $tenant->code          = $code;
        $tenant->nom           = $nom;
        $tenant->email_contact = $this->option('email');
        $tenant->ville         = $this->option('ville');
        $tenant->group_id      = $groupId;
        $tenant->actif         = true;
        $tenant->save();

        $tenant->domains()->create(['domain' => $domaine]);

        $this->info("✓ Tenant créé : $id");
        $this->info("✓ Domaine configuré : $domaine");
        $this->info("✓ Base de données créée et migrée");

        // Créer l'administrateur initial si fourni
        $adminEmail    = $this->option('admin-email');
        $adminPassword = $this->option('admin-password');

        // Initialiser la tenancy pour peupler la base tenant
        tenancy()->initialize($tenant);

        \App\Models\Etablissement::create([
            'nom'   => $nom,
            'type'  => $type,
            'ville' => $this->option('ville'),
            'email' => $this->option('email'),
            'pays'  => "Côte d'Ivoire",
        ]);

        $this->info("✓ Établissement initialisé : $nom");

        if ($type) {
            $annee = $this->option('annee') ?: $this->anneeEnCours();
            $stats = app(TemplateService::class)->appliquer($id, $type, $annee, $this->option('periodes'));
            // TemplateService appelle tenancy()->end() en interne — ré-initialiser
            tenancy()->initialize($tenant);

            $this->info("✓ Modèle '$type' appliqué ($annee) : " . collect($stats)->filter(fn ($v) => $v > 0)->map(fn ($v, $k) => "$v $k")->implode(', '));
        }

        if ($adminEmail && $adminPassword) {
            $role = \App\Models\Role::create([
                'nom'         => 'Administrateur',
                'label'       => 'Administrateur',
                'super'       => true,
                'permissions' => json_encode([]),
            ]);

            \App\Models\User::create([
                'name'     => 'Administrateur',
                'email'    => $adminEmail,
                'password' => Hash::make($adminPassword),
                'role_id'  => $role->id,
            ]);

            $this->info("✓ Rôle super-admin créé");
            $this->info("✓ Administrateur créé : $adminEmail");
        }

        tenancy()->end();

        $this->newLine();
        $this->table(
            ['Propriété', 'Valeur'],
            [
                ['ID', $id],
                ['Code établissement', $code],
                ['Nom', $nom],
                ['Domaine', $domaine],
                ['Groupe', $groupId ? "#$groupId" : '(indépendant)'],
                ['URL API', "https://$domaine/api"],
            ]
        );

        return 0;
    }

    private function generateUniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (Tenant::where('code', $code)->exists());

        return $code;
    }

    private function anneeEnCours(): string
    {
        $mois = (int) now()->format('m');
        $an   = (int) now()->format('Y');
        return $mois >= 9 ? "{$an}-" . ($an + 1) : ($an - 1) . "-{$an}";
    }
}
