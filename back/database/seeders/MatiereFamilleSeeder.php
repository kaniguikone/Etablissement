<?php

namespace Database\Seeders;

use App\Models\Matiere;
use Illuminate\Database\Seeder;

/**
 * Renseigne les champs EDT des matières (famille, couleur, salle requise,
 * effort soutenu) à partir de l'abréviation — cf. chantier EDT — Lot 0.1.
 *
 * Idempotent : ne touche que les matières dont la famille n'est pas encore
 * définie. Rejouable sur un tenant existant :
 *   php artisan db:seed --class=MatiereFamilleSeeder
 */
class MatiereFamilleSeeder extends Seeder
{
    /** Familles dont les cours exigent un effort soutenu (règle des 5h MENET). */
    private const NON_SOUTENU = ['eps', 'arts_em', 'edhc', 'tic', 'autre'];

    /** Type de salle spécialisée imposé par famille. */
    private const SALLE_REQUISE = [
        'pc' => 'labo',
        'svt' => 'labo',
        'eps' => 'gymnase',
        'tic' => 'salle_info',
    ];

    public function run(): void
    {
        foreach (Matiere::whereNull('famille')->get() as $matiere) {
            $abbr = strtoupper(trim($matiere->abbr_matiere ?? ''));
            $famille = Matiere::SUGGESTIONS_FAMILLE[$abbr] ?? null;

            if (! $famille) {
                continue; // abréviation non reconnue : laissé à la configuration manuelle
            }

            $matiere->update([
                'famille' => $famille,
                'couleur' => Matiere::FAMILLES[$famille][1] ?? null,
                'salle_type_requis' => self::SALLE_REQUISE[$famille] ?? null,
                'effort_soutenu' => ! in_array($famille, self::NON_SOUTENU, true),
            ]);
        }
    }
}
