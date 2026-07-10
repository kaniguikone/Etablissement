<?php

namespace Database\Seeders;

use App\Models\CentralUser;
use App\Models\Enseignant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Initialise les mots de passe des enseignants et crée leurs comptes centraux.
 *
 * Utilisation : php artisan db:seed --class=EnseignantAuthSeeder (depuis un tenant)
 */
class EnseignantAuthSeeder extends Seeder
{
    public function run(): void
    {
        $enseignants = Enseignant::all();

        if ($enseignants->isEmpty()) {
            $this->command->warn('Aucun enseignant trouvé. Lance DatabaseSeeder d\'abord.');
            return;
        }

        $tenantId = tenant('id');
        $lies     = 0;

        foreach ($enseignants as $enseignant) {
            $enseignant->update([
                'password' => Hash::make('12345'),
            ]);

            if (! $enseignant->telephone_enseignant) {
                continue;
            }

            CentralUser::lierEnseignant($enseignant, $tenantId);
            $lies++;
        }

        $this->command->info("✓ {$enseignants->count()} enseignant(s) mis à jour, {$lies} compte(s) central(aux) créé(s).");
    }
}
