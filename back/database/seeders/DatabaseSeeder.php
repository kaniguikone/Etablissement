<?php

namespace Database\Seeders;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Niveau;
use App\Models\Matiere;
use App\Models\Enseignant;
use Illuminate\Support\Str;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $matieres = [
            'Mathématiques',
            'Sciences de Vie et de la Terre',
            'Histoire-Géographie',
            'Scineces Physiques et Chimie',
            'Musique',
            'Arts Plastiques',
            'Education Physique et Sportive',
            'Anglais',
            'Français',
            'Allemand',
            'Espagnol',
        ];
        foreach ($matieres as $matiere) {
            Matiere::create(['libelle_matiere' => $matiere, 'description_matiere' => Str::slug($matiere)]);
        }

        $niveaux = [
            ['Sixième','6ième'],
            ['Cinquième','5ième'],
            ['Quatrième','4ième'],
            ['Troisième','3ième'],
            ['Seconde','2nde'],
            ['Première','1ère'],
            ['Terminale','Tle'],
        ];

        foreach ($niveaux as $niveau) {
            Niveau::create(['nom_niveau' => $niveau[0], 'abbr_niveau' => $niveau[1]]);
        }

        $num = [1,2,3,4,5];
        $listeNiveaux = Niveau::all();

        foreach ($listeNiveaux as $niveau) {
            for ($i=0;$i<5;$i++){
                Classe::factory()->create([
                    'num_classe' => $num[$i],
                    'nom_classe' => $niveau->nom_niveau." ".(string)($num[$i]),
                    'abbr_classe' => $niveau->abbr_niveau." ".(string)($num[$i]),
                    'niveau_id' => $niveau->id
                ]);
            }
        }

        $ids = range(1, 7);

        Eleve::factory()->count(150)->create();


        Enseignant::factory()->count(55)->create()->each(function ($enseignant) use ($ids) {
            shuffle($ids);
            $enseignant->matieres()->attach(array_slice($ids, 0, rand(1, 3)));
            shuffle($ids);
            $enseignant->classes()->attach(array_slice($ids, 0, rand(1, 3)));
        });
    }
}
