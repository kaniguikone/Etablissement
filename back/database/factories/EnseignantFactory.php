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
        return [
            'matricule_enseignant' => $this->faker->regexify('[A-Z0-9]{8}'),
            'nom_enseignant' => $this->faker->lastName(),
            'prenoms_enseignant' => $this->faker->firstName(),
        ];
    }
}
