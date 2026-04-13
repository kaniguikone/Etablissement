<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class EnseignantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $statuts = ['CDI', 'CDD', 'Stagiaire', 'Vacataire'];

        return [
            'matricule_enseignant'      => $this->faker->regexify('[A-Z0-9]{8}'),
            'nom_enseignant'            => $this->faker->lastName(),
            'prenoms_enseignant'        => $this->faker->firstName(),
            'genre_enseignant'          => $this->faker->randomElement(['M', 'F']),
            'telephone_enseignant'      => $this->faker->regexify('0[0-9]{9}'),
            'email_enseignant'          => $this->faker->unique()->safeEmail(),
            'date_naissance_enseignant' => $this->faker->date('Y-m-d', '-25 years'),
            'date_embauche_enseignant'  => $this->faker->date('Y-m-d', 'now'),
            'statut_enseignant'         => $this->faker->randomElement($statuts),
        ];
    }
}
