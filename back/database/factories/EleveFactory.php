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
        ];
    }
}
