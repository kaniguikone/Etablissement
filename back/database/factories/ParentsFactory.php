<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Model>
 */
class ParentsFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $relations    = ['Père', 'Mère', 'Tuteur', 'Autre'];
        $professions  = ['Fonctionnaire', 'Commerçant(e)', 'Ingénieur(e)', 'Enseignant(e)', 'Médecin', 'Agriculteur', 'Artisan', 'Entrepreneur'];
        $quartiers    = ['Cocody', 'Yopougon', 'Abobo', 'Marcory', 'Treichville', 'Adjamé', 'Plateau', 'Port-Bouët'];

        return [
            'numero_parent'    => $this->faker->regexify('0[0-9]{9}'),
            'nom_parent'       => $this->faker->lastName(),
            'prenom_parent'    => $this->faker->firstName(),
            'password'         => \Illuminate\Support\Facades\Hash::make('12345'),
            'email_parent'     => $this->faker->unique()->safeEmail(),
            'adresse_parent'   => $this->faker->randomElement($quartiers) . ', Abidjan',
            'relation_parent'  => $this->faker->randomElement($relations),
            'profession_parent'=> $this->faker->randomElement($professions),
        ];
    }
}
