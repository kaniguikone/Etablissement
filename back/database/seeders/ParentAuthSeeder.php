<?php

namespace Database\Seeders;

use App\Models\Parents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Initialise les mots de passe et informations des parents existants
 * pour permettre l'accès à l'application mobile.
 *
 * Utilisation : php artisan db:seed --class=ParentAuthSeeder
 */
class ParentAuthSeeder extends Seeder
{
    public function run(): void
    {
        $parents = Parents::all();

        if ($parents->isEmpty()) {
            $this->command->warn('Aucun parent trouvé. Lance DatabaseSeeder d\'abord.');
            return;
        }

        $relations   = ['Père', 'Mère', 'Tuteur', 'Autre'];
        $professions = ['Fonctionnaire', 'Commerçant(e)', 'Ingénieur(e)', 'Enseignant(e)', 'Médecin', 'Agriculteur'];
        $quartiers   = ['Cocody', 'Yopougon', 'Abobo', 'Marcory', 'Treichville', 'Adjamé'];

        foreach ($parents as $i => $parent) {
            $parent->update([
                'password'          => Hash::make('12345'),
                'nom_parent'        => $parent->nom_parent    ?: 'Parent' . ($i + 1),
                'prenom_parent'     => $parent->prenom_parent ?: 'Prénom' . ($i + 1),
                'email_parent'      => $parent->email_parent  ?: 'parent' . ($i + 1) . '@exemple.ci',
                'adresse_parent'    => $parent->adresse_parent    ?: $quartiers[$i % count($quartiers)] . ', Abidjan',
                'relation_parent'   => $parent->relation_parent   ?: $relations[$i % count($relations)],
                'profession_parent' => $parent->profession_parent ?: $professions[$i % count($professions)],
            ]);
        }

        $this->command->info("✓ {$parents->count()} parent(s) mis à jour avec le mot de passe « 12345 » et les informations complémentaires.");
    }
}
