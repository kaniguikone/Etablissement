<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigratePermissions extends Command
{
    protected $signature   = 'permissions:migrate-split {--tenants=* : IDs des tenants ciblés (tous par défaut)}';
    protected $description = 'Convertit pedagogie → pedagogie_saisie + pedagogie_pilotage, finances → finances_caisse + finances_gestion';

    public function handle(): int
    {
        $tenantIds = $this->option('tenants');
        $tenants   = $tenantIds
            ? Tenant::whereIn('id', $tenantIds)->get()
            : Tenant::all();

        foreach ($tenants as $tenant) {
            $tenant->run(function () use ($tenant) {
                $updated = 0;

                foreach (DB::table('roles')->get() as $role) {
                    $decoded     = json_decode($role->permissions, true);
                    $permissions = is_array($decoded) ? $decoded : [];
                    $changed     = false;

                    if (in_array('pedagogie', $permissions)) {
                        $permissions = array_diff($permissions, ['pedagogie']);
                        array_push($permissions, 'pedagogie_saisie', 'pedagogie_pilotage');
                        $changed = true;
                    }

                    if (in_array('finances', $permissions)) {
                        $permissions = array_diff($permissions, ['finances']);
                        array_push($permissions, 'finances_caisse', 'finances_gestion');
                        $changed = true;
                    }

                    if ($changed) {
                        DB::table('roles')
                            ->where('id', $role->id)
                            ->update(['permissions' => json_encode(array_values($permissions))]);
                        $updated++;
                    }
                }

                $this->line("  <info>{$tenant->id}</info> : {$updated} rôle(s) mis à jour");
            });
        }

        $this->info('Conversion terminée.');
        return self::SUCCESS;
    }
}
