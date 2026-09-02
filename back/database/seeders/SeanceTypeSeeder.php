<?php

namespace Database\Seeders;

use App\Models\NiveauMatiere;
use App\Models\SeanceType;
use App\Models\VolumeHoraire;
use Illuminate\Database\Seeder;

/**
 * Pré-remplit le découpage en séances à partir des volumes horaires
 * (chantier EDT — Lot 0.4 / 0.6).
 *
 * Base : n séances de 55 min = volume horaire arrondi. Puis surcharge des cas
 * MENET connus : une séance de 2h (« 2h consécutives ») pour Français, Maths
 * et Philosophie ; passage des labos PC/SVT en quinzaine au 1er cycle.
 *
 * Idempotent : ignore toute matière ayant déjà au moins une séance.
 *   php artisan db:seed --class=SeanceTypeSeeder
 */
class SeanceTypeSeeder extends Seeder
{
    /** Familles bénéficiant d'une séance double hebdomadaire. */
    private const DOUBLE = ['francais', 'maths', 'philo'];

    public function run(): void
    {
        $volumes = VolumeHoraire::get()->keyBy(fn ($v) => "{$v->niveau_id}_{$v->matiere_id}");

        $niveauMatieres = NiveauMatiere::with('matiere:id,famille')
            ->withCount('seancesTypes')
            ->get();

        foreach ($niveauMatieres as $nm) {
            if ($nm->seances_types_count > 0) {
                continue;
            }

            $vh = $volumes->get("{$nm->niveau_id}_{$nm->matiere_id}");
            $heures = (int) round((float) ($vh->heures_semaine ?? 0));
            if ($heures < 1) {
                continue;
            }

            $famille = $nm->matiere?->famille;

            if (in_array($famille, self::DOUBLE, true) && $heures >= 3) {
                SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 110, 'nb_seances' => 1, 'ordre' => 0]);
                if ($heures - 2 > 0) {
                    SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => $heures - 2, 'ordre' => 1]);
                }

                continue;
            }

            SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => $heures, 'ordre' => 0]);
        }
    }
}
