<?php

namespace Database\Seeders;

use App\Models\Etablissement;
use Illuminate\Database\Seeder;

class EtablissementSeeder extends Seeder
{
    public function run(): void
    {
        Etablissement::truncate();

        Etablissement::create([
            'nom'        => 'Lycée Moderne Excellence',
            'slogan'     => 'L\'excellence au service de la jeunesse',
            'adresse'    => 'Boulevard Latrille, Cocody',
            'ville'      => 'Abidjan',
            'bp'         => 'BP 1234',
            'telephone'  => '+225 27 22 41 00 00',
            'telephone2' => '+225 07 07 00 00 00',
            'email'      => 'contact@lycee-excellence.ci',
            'site_web'   => 'www.lycee-excellence.ci',
            'pays'       => 'Côte d\'Ivoire',
        ]);
    }
}
