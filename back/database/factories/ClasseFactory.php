<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ClasseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'salle_classe'        => 'Salle ' . $this->faker->regexify('[A-C][0-9]'),
            'effectif_max_classe' => $this->faker->numberBetween(30, 45),
        ];
    }
}
