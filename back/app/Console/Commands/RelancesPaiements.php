<?php

namespace App\Console\Commands;

use App\Services\NotificationService;
use Illuminate\Console\Command;

class RelancesPaiements extends Command
{
    protected $signature   = 'notifications:relances-paiements {--dry-run : Compter sans envoyer}';
    protected $description = 'Envoie des relances email aux parents dont les paiements sont en retard';

    public function handle(NotificationService $notifService): int
    {
        if ($this->option('dry-run')) {
            $this->info('[Dry-run] Simulation uniquement, aucun email ne sera envoyé.');
        }

        $result = $notifService->relancerPaiementsEnRetard();

        $this->info("Relances envoyées  : {$result['envoyes']}");
        $this->info("Ignorés (sans email): {$result['ignores']}");

        return 0;
    }
}
