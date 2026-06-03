<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;

class SyncTenantDomains extends Command
{
    protected $signature   = 'tenants:sync-domains {--dry-run : Afficher les changements sans les appliquer}';
    protected $description = 'Resynchronise les domaines de tous les tenants avec l\'environnement actuel';

    public function handle(): int
    {
        $suffix  = app()->environment('local') ? 'localhost' : config('app.tenant_domain', 'suiviscolaire.ci');
        $dryRun  = $this->option('dry-run');
        $tenants = Tenant::all();

        $this->info("Environnement : <fg=yellow>" . app()->environment() . "</> → suffixe : <fg=yellow>{$suffix}</>");
        $this->newLine();

        $changed = 0;

        foreach ($tenants as $tenant) {
            $domainActuel  = $tenant->domains()->value('domain') ?? '(aucun)';
            $domainAttendu = $tenant->id . '.' . $suffix;

            if ($domainActuel === $domainAttendu) {
                $this->line("  <fg=green>✓</> {$tenant->id} → {$domainActuel}");
                continue;
            }

            $this->line("  <fg=yellow>~</> {$tenant->id}");
            $this->line("      avant  : {$domainActuel}");
            $this->line("      après  : {$domainAttendu}");

            if (! $dryRun) {
                $tenant->domains()->delete();
                $tenant->domains()->create(['domain' => $domainAttendu]);
            }

            $changed++;
        }

        $this->newLine();

        if ($dryRun) {
            $this->warn("{$changed} domaine(s) à corriger. Relancez sans --dry-run pour appliquer.");
        } else {
            $this->info("{$changed} domaine(s) mis à jour.");
        }

        return self::SUCCESS;
    }
}
