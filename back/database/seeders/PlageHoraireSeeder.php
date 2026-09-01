<?php

namespace Database\Seeders;

use App\Models\PlageHoraire;
use Illuminate\Database\Seeder;

/**
 * Grille horaire type (système ivoirien) — chantier EDT, Lot 0.2 / 0.6.
 *
 * Idempotent : ne crée rien si des plages existent déjà.
 *   php artisan db:seed --class=PlageHoraireSeeder
 */
class PlageHoraireSeeder extends Seeder
{
    /** [jour => [ [libellé, début, fin, type], ... ] ]. jour 'ouvre' = lun-ven. */
    private const GRILLE = [
        'ouvre' => [
            ['M1', '07:30', '08:25', 'cours'],
            ['M2', '08:25', '09:20', 'cours'],
            ['M3', '09:20', '10:15', 'cours'],
            ['Récréation', '10:15', '10:30', 'recreation'],
            ['M4', '10:30', '11:25', 'cours'],
            ['M5', '11:25', '12:20', 'cours'],
            ['Pause méridienne', '12:20', '15:00', 'pause_midi'],
            ['S1', '15:00', '15:55', 'cours'],
            ['S2', '15:55', '16:50', 'cours'],
        ],
        'mercredi' => [
            ['M1', '07:30', '08:25', 'cours'],
            ['M2', '08:25', '09:20', 'cours'],
            ['M3', '09:20', '10:15', 'cours'],
            ['Récréation', '10:15', '10:30', 'recreation'],
            ['M4', '10:30', '11:25', 'cours'],
            ['M5', '11:25', '12:20', 'cours'],
        ],
        'samedi' => [
            ['M1', '07:30', '08:25', 'cours'],
            ['M2', '08:25', '09:20', 'cours'],
            ['M3', '09:20', '10:15', 'cours'],
            ['M4', '10:15', '11:10', 'cours'],
        ],
    ];

    public function run(): void
    {
        if (PlageHoraire::exists()) {
            return;
        }

        $inserer = function (string $jour, array $lignes) {
            foreach ($lignes as $i => [$libelle, $debut, $fin, $type]) {
                PlageHoraire::create([
                    'libelle' => $libelle,
                    'jour' => $jour,
                    'ordre' => $i + 1,
                    'heure_debut' => $debut,
                    'heure_fin' => $fin,
                    'type' => $type,
                ]);
            }
        };

        foreach (['lundi', 'mardi', 'jeudi', 'vendredi'] as $jour) {
            $inserer($jour, self::GRILLE['ouvre']);
        }
        $inserer('mercredi', self::GRILLE['mercredi']);
        $inserer('samedi', self::GRILLE['samedi']);
    }
}
