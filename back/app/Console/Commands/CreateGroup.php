<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Group;
use App\Models\GroupAdmin;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateGroup extends Command
{
    protected $signature = 'group:create
        {nom : Nom du groupe scolaire}
        {--email= : Email de contact du groupe}
        {--admin-email= : Email de l\'administrateur du groupe}
        {--admin-password= : Mot de passe de l\'administrateur}
        {--admin-nom= : Nom de l\'administrateur}
        {--tenants=* : IDs des établissements à rattacher (ex: lycee-moderne college-avenir)}';

    protected $description = 'Créer un groupe scolaire et y rattacher des établissements';

    public function handle(): int
    {
        $group = Group::create([
            'nom'           => $this->argument('nom'),
            'email_contact' => $this->option('email'),
            'actif'         => true,
        ]);

        $this->info("✓ Groupe créé : {$group->nom} (ID: {$group->id})");

        // Rattacher les tenants existants
        $tenantIds = $this->option('tenants');
        if (!empty($tenantIds)) {
            foreach ($tenantIds as $tenantId) {
                $tenant = Tenant::find($tenantId);
                if ($tenant) {
                    $tenant->update(['group_id' => $group->id]);
                    $this->info("  ✓ Établissement rattaché : {$tenant->nom}");
                } else {
                    $this->warn("  ✗ Établissement introuvable : {$tenantId}");
                }
            }
        }

        // Créer l'admin du groupe
        $adminEmail    = $this->option('admin-email');
        $adminPassword = $this->option('admin-password');
        $adminNom      = $this->option('admin-nom') ?? 'Administrateur Groupe';

        if ($adminEmail && $adminPassword) {
            GroupAdmin::create([
                'group_id' => $group->id,
                'nom'      => $adminNom,
                'email'    => $adminEmail,
                'password' => Hash::make($adminPassword),
            ]);
            $this->info("  ✓ Administrateur créé : {$adminEmail}");
        }

        $this->newLine();
        $this->table(
            ['Propriété', 'Valeur'],
            [
                ['ID',               $group->id],
                ['Nom',              $group->nom],
                ['Établissements',   implode(', ', $tenantIds ?: [])],
                ['Admin',            $adminEmail ?? '(non créé)'],
                ['API login',        '/api/group/login'],
                ['API dashboard',    '/api/group/dashboard'],
            ]
        );

        return 0;
    }
}
