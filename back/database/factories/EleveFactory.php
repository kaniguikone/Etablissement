<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class EleveFactory extends Factory
{
    public function definition(): array
    {
        $villes      = ['Abidjan', 'Bouaké', 'Daloa', 'Korhogo', 'Man', 'San-Pédro', 'Yamoussoukro', 'Divo'];
        $nationalites = ['Ivoirienne', 'Burkinabè', 'Malienne', 'Guinéenne', 'Sénégalaise'];
        $quartiers   = ['Cocody', 'Yopougon', 'Abobo', 'Marcory', 'Treichville', 'Adjamé', 'Plateau', 'Port-Bouët'];
        $handicaps   = ['moteur', 'malvoyant', 'malentendant', 'albinisme', 'nanisme', 'begayement', 'autiste'];

        return [
            'matricule_eleve'      => $this->faker->unique()->numerify('EL######'),
            'nom_eleve'            => $this->faker->lastName(),
            'prenoms_eleve'        => $this->faker->firstName(),
            'date_naissance_eleve' => $this->faker->dateTimeBetween('-20 years', '-10 years')->format('Y-m-d'),
            'photo_eleve'          => null,
            'genre_eleve'          => $this->faker->randomElement(['M', 'F']),
            'lieu_naissance_eleve' => $this->faker->randomElement($villes),
            'nationalite_eleve'    => $this->faker->randomElement($nationalites),
            'adresse_eleve'        => $this->faker->randomElement($quartiers) . ', ' . $this->faker->randomElement($villes),
            'classe_id'            => 1,  // overridden in seeder
            'parent_id'            => 1,  // overridden in seeder

            // Champs utilisés par les stats générales (MENET) : on distribue des valeurs
            // réalistes pour que le rapport ne reste pas à zéro sur ces sections.
            'statut_eleve'    => $this->faker->randomElement(array_merge(
                array_fill(0, 94, 'actif'),
                array_fill(0, 2, 'abandon'),
                array_fill(0, 1, 'decede'),
                array_fill(0, 3, 'inactif'),
            )),
            'statut_bourse'   => $this->faker->randomElement(array_merge(
                array_fill(0, 80, 'non_boursier'),
                array_fill(0, 12, 'demi_boursier'),
                array_fill(0, 8, 'boursier'),
            )),
            'est_affecte'     => $this->faker->boolean(22),
            'types_handicap'  => $this->faker->boolean(3) ? [$this->faker->randomElement($handicaps)] : null,
            'statut_orphelin' => $this->faker->randomElement(array_merge(
                array_fill(0, 94, null),
                array_fill(0, 3, 'pere'),
                array_fill(0, 2, 'mere'),
                array_fill(0, 1, 'les_deux'),
            )),
            // langue2 par défaut (espagnol/allemand possibles) ; le seeder restreint
            // à "autre"/aucune pour les niveaux avant la 4ième.
            'langue2'         => $this->faker->randomElement(array_merge(
                array_fill(0, 30, 'espagnol'),
                array_fill(0, 25, 'allemand'),
                array_fill(0, 5, 'autre'),
                array_fill(0, 40, null),
            )),
        ];
    }
}
