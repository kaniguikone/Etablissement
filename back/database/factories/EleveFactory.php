<?php

namespace Database\Factories;

use App\Models\Niveau;
use Illuminate\Database\Eloquent\Factories\Factory;

class EleveFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'matricule_eleve' => $this->faker->regexify('[A-Z0-9]{8}'),
            'nom_eleve' => $this->faker->lastName(),
            'prenoms_eleve' => $this->faker->firstName(),
            'date_naissance_eleve' => $this->faker->date('Y-m-d', now()),
            'classe_id' => $this->faker->numberBetween(1,35),
        ];
    }
}
