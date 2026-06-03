<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TarifsLicenceSeeder extends Seeder
{
    public function run(): void
    {
        DB::connection('mysql')->table('tarifs_licence')->truncate();

        DB::connection('mysql')->table('tarifs_licence')->insert([
            ['tranche_min' => 1,    'tranche_max' => 200,  'prix_par_eleve' => 5000, 'ordre' => 1, 'actif' => true, 'created_at' => now(), 'updated_at' => now()],
            ['tranche_min' => 201,  'tranche_max' => 500,  'prix_par_eleve' => 4000, 'ordre' => 2, 'actif' => true, 'created_at' => now(), 'updated_at' => now()],
            ['tranche_min' => 501,  'tranche_max' => 1000, 'prix_par_eleve' => 3500, 'ordre' => 3, 'actif' => true, 'created_at' => now(), 'updated_at' => now()],
            ['tranche_min' => 1001, 'tranche_max' => null,  'prix_par_eleve' => 3000, 'ordre' => 4, 'actif' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::connection('mysql')->table('config_saas')->truncate();

        DB::connection('mysql')->table('config_saas')->insert([
            ['cle' => 'plancher_minimum',   'valeur' => '500000',  'libelle' => 'Montant minimum annuel (FCFA)',       'created_at' => now(), 'updated_at' => now()],
            ['cle' => 'duree_demo_jours',   'valeur' => '30',      'libelle' => 'Durée de la période démo (jours)',    'created_at' => now(), 'updated_at' => now()],
            ['cle' => 'devise',             'valeur' => 'FCFA',    'libelle' => 'Devise de facturation',               'created_at' => now(), 'updated_at' => now()],
            ['cle' => 'taux_tva',           'valeur' => '18',      'libelle' => 'Taux TVA (%)',                        'created_at' => now(), 'updated_at' => now()],
            ['cle' => 'tarif_acces_parent', 'valeur' => '2000',    'libelle' => 'Tarif accès parent mobile (FCFA/an)', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
