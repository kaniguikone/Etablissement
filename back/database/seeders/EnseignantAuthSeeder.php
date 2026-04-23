<?php

namespace Database\Seeders;

use App\Models\Enseignant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Initialise les numéros et mots de passe des enseignants
 * pour l'accès à l'application mobile enseignant.
 *
 * Utilisation : php artisan db:seed --class=EnseignantAuthSeeder
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

        foreach ($enseignants as $enseignant) {
            $enseignant->update([
                'password' => Hash::make('12345'),
            ]);
        }

        $this->command->info("✓ {$enseignants->count()} enseignant(s) mis à jour avec le mot de passe « 12345 ».");
    }
}
