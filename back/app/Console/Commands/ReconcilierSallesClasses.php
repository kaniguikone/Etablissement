<?php

namespace App\Console\Commands;

use App\Models\Classe;
use App\Models\Salle;
use App\Models\Tenant;
use Illuminate\Console\Command;

/**
 * Rapproche l'ancien champ texte `classes.salle_classe` de la nouvelle FK
 * `classes.salle_id` (chantier EDT — Lot 0.3).
 *
 * Non destructif par défaut (dry-run) : affiche les correspondances trouvées.
 * Avec --apply, écrit `salle_id` uniquement pour les classes qui n'en ont pas
 * encore et dont le libellé correspond exactement (insensible à la casse) à
 * une salle existante.
 */
class ReconcilierSallesClasses extends Command
{
    protected $signature = 'edt:reconcilier-salles {--apply : Écrire les correspondances (sinon simple aperçu)} {--tenant= : Limiter à un tenant}';

    protected $description = 'Associe classes.salle_classe (texte) à une salle existante (classes.salle_id)';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $tenants = $this->option('tenant')
            ? Tenant::where('id', $this->option('tenant'))->get()
            : Tenant::all();

        foreach ($tenants as $tenant) {
            tenancy()->initialize($tenant);

            $salles = Salle::all();
            $classes = Classe::whereNull('salle_id')
                ->whereNotNull('salle_classe')
                ->where('salle_classe', '!=', '')
                ->get();

            if ($classes->isEmpty()) {
                tenancy()->end();

                continue;
            }

            $this->line("<info>Tenant {$tenant->id}</info> — {$classes->count()} classe(s) à rapprocher");

            $rapproches = 0;
            foreach ($classes as $classe) {
                $cible = $salles->first(fn (Salle $s) => mb_strtolower(trim($s->nom)) === mb_strtolower(trim($classe->salle_classe)));

                if (! $cible) {
                    $this->line("  · {$classe->nom_classe} : « {$classe->salle_classe} » → aucune salle correspondante");

                    continue;
                }

                $this->line("  ✓ {$classe->nom_classe} : « {$classe->salle_classe} » → salle #{$cible->id}");
                if ($apply) {
                    $classe->update(['salle_id' => $cible->id]);
                }
                $rapproches++;
            }

            $this->line($apply
                ? "  → {$rapproches} classe(s) mises à jour"
                : "  → {$rapproches} correspondance(s) (relancez avec --apply pour écrire)");

            tenancy()->end();
        }

        return self::SUCCESS;
    }
}
