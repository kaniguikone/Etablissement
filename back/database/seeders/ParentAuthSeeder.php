<?php

namespace Database\Seeders;

use App\Models\CentralUser;
use App\Models\Parents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Initialise les mots de passe des parents existants et crée leurs comptes centraux.
 *
 * Utilisation : php artisan db:seed --class=ParentAuthSeeder (depuis un tenant)
 */
class ParentAuthSeeder extends Seeder
{
    public function run(): void
    {
        $parents = Parents::with('eleves', 'elevesLegacy')->get();

        if ($parents->isEmpty()) {
            $this->command->warn('Aucun parent trouvé. Lance DatabaseSeeder d\'abord.');
            return;
        }

        $relations   = ['Père', 'Mère', 'Tuteur', 'Autre'];
        $professions = ['Fonctionnaire', 'Commerçant(e)', 'Ingénieur(e)', 'Enseignant(e)', 'Médecin', 'Agriculteur'];
        $quartiers   = ['Cocody', 'Yopougon', 'Abobo', 'Marcory', 'Treichville', 'Adjamé'];

        $tenantId = tenant('id');
        $lies     = 0;

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

            if (! $parent->numero_parent) {
                continue;
            }

            $central = CentralUser::lierParent($parent);

            // Enfants via pivot eleve_parent
            foreach ($parent->eleves as $eleve) {
                CentralUser::ajouterEnfant($central, $tenantId, $eleve->matricule_eleve, 'school_collects');
            }

            // Enfants via champ legacy parent_id
            foreach ($parent->elevesLegacy as $eleve) {
                CentralUser::ajouterEnfant($central, $tenantId, $eleve->matricule_eleve, 'school_collects');
            }

            $lies++;
        }

        $this->command->info("✓ {$parents->count()} parent(s) mis à jour, {$lies} compte(s) central(aux) créé(s).");
    }
}
