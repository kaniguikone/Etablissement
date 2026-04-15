<?php

namespace App\Console\Commands;

use App\Services\TemplateService;
use Illuminate\Console\Command;

class ApplyTemplate extends Command
{
    protected $signature = 'template:apply
                            {tenant   : ID du tenant (ex: lycee-test)}
                            {type     : Type de template (lycee, lycee_complet, college, primaire)}
                            {annee    : Année scolaire (ex: 2024-2025)}
                            {--periodes=trimestre : Type de périodes (trimestre ou semestre)}';

    protected $description = 'Applique un template de données scolaires à un établissement';

    public function handle(TemplateService $service): int
    {
        $tenantId     = $this->argument('tenant');
        $type         = $this->argument('type');
        $annee        = $this->argument('annee');
        $periodesType = $this->option('periodes');

        $templates = TemplateService::liste();
        if (!isset($templates[$type])) {
            $this->error("Template inconnu : {$type}");
            $this->line('Templates disponibles : ' . implode(', ', array_keys($templates)));
            return self::FAILURE;
        }

        $this->info("Application du template « {$templates[$type]['nom']} »");
        $this->info("  Tenant  : {$tenantId}");
        $this->info("  Année   : {$annee}");
        $this->info("  Périodes: {$periodesType}");

        if (!$this->confirm('Confirmer ?', true)) {
            return self::SUCCESS;
        }

        try {
            $stats = $service->appliquer($tenantId, $type, $annee, $periodesType);

            $this->newLine();
            $this->info('✓ Template appliqué avec succès :');
            $this->table(
                ['Élément', 'Créés'],
                collect($stats)->map(fn($v, $k) => [ucfirst(str_replace('_', ' ', $k)), $v])->values()->toArray()
            );
        } catch (\Exception $e) {
            $this->error('Erreur : ' . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
