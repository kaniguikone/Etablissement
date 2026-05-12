<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class TenantsFresh extends Command
{
    protected $signature   = 'tenants:fresh {--tenants=* : IDs des tenants ciblés (tous par défaut)}';
    protected $description = 'migrate:fresh + db:seed sur tous les tenants (ou ceux spécifiés)';

    public function handle(): int
    {
        $ids     = $this->option('tenants');
        $tenants = $ids ? Tenant::whereIn('id', $ids)->get() : Tenant::all();

        foreach ($tenants as $tenant) {
            $this->line("Tenant : <info>{$tenant->id}</info>");

            $tenant->run(function () {
                Artisan::call('migrate:fresh', [
                    '--path'     => database_path('migrations/tenant'),
                    '--realpath' => true,
                    '--force'    => true,
                ], $this->output);

                Artisan::call('db:seed', [
                    '--force' => true,
                ], $this->output);
            });
        }

        $this->info('Terminé.');
        return self::SUCCESS;
    }

}
