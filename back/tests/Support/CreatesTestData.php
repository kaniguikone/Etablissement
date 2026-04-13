<?php

namespace Tests\Support;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Niveau;
use App\Models\Parents;
use App\Models\Role;
use App\Models\User;

/**
 * Trait utilitaire pour créer des données de test rapidement.
 */
trait CreatesTestData
{
    /**
     * Crée un utilisateur super-admin et l'authentifie pour les requêtes suivantes.
     */
    protected function connecterAdmin(): User
    {
        $role = Role::create([
            'nom'   => 'super_admin',
            'label' => 'Super Administrateur',
            'super' => true,
            'actif' => true,
        ]);

        $user = User::create([
            'name'     => 'Admin Test',
            'email'    => 'admin@test.com',
            'password' => bcrypt('password'),
            'role_id'  => $role->id,
            'actif'    => true,
        ]);

        $this->actingAs($user, 'sanctum');

        return $user;
    }

    protected function creerParent(string $numero = 'PAR001'): Parents
    {
        return Parents::create([
            'numero_parent' => $numero,
            'nom_parent'    => 'PARENT',
            'prenom_parent' => 'Test',
        ]);
    }

    protected function creerNiveau(string $nom = 'CM1', string $abbr = 'CM1'): Niveau
    {
        return Niveau::create(['nom_niveau' => $nom, 'abbr_niveau' => $abbr]);
    }

    protected function creerClasse(int $niveauId, string $nom = 'CM1 A', string $abbr = 'CM1A'): Classe
    {
        static $num = 1;
        return Classe::create([
            'num_classe'  => (string) $num++,
            'nom_classe'  => $nom,
            'abbr_classe' => $abbr,
            'niveau_id'   => $niveauId,
        ]);
    }

    protected function creerEleve(
        int $classeId,
        string $matricule = 'ELV001',
        string $nom = 'TEST',
        string $prenoms = 'Élève',
        ?int $parentId = null
    ): Eleve {
        if ($parentId === null) {
            $parent   = $this->creerParent('PAR-' . $matricule);
            $parentId = $parent->id;
        }

        return Eleve::create([
            'matricule_eleve'      => $matricule,
            'nom_eleve'            => $nom,
            'prenoms_eleve'        => $prenoms,
            'date_naissance_eleve' => '2013-01-01',
            'classe_id'            => $classeId,
            'parent_id'            => $parentId,
        ]);
    }
}
