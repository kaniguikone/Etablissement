<?php

namespace Database\Seeders;

use App\Models\Group;
use App\Models\GroupAdmin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class GroupSeeder extends Seeder
{
    public function run(): void
    {
        // Supprimer les données de test existantes
        DB::connection('mysql')->table('group_admins')->where('email', 'groupe@test.ci')->delete();
        $existing = DB::connection('mysql')->table('groups')->where('nom', 'Groupe Scolaire Test')->first();
        if ($existing) {
            DB::connection('mysql')->table('group_admins')->where('group_id', $existing->id)->delete();
            DB::connection('mysql')->table('groups')->where('id', $existing->id)->delete();
        }

        // Créer le groupe de test
        $group = Group::create([
            'nom'           => 'Groupe Scolaire Test',
            'email_contact' => 'contact@groupe-test.ci',
            'telephone'     => '+225 27 00 00 00 00',
            'pays'          => 'Côte d\'Ivoire',
            'actif'         => true,
        ]);

        // Créer l'admin du groupe
        GroupAdmin::create([
            'group_id' => $group->id,
            'nom'      => 'Admin Groupe',
            'email'    => 'groupe@test.ci',
            'password' => Hash::make('groupe123'),
        ]);

        // Rattacher le tenant de test au groupe (via la connexion centrale)
        DB::connection('mysql')->table('tenants')
            ->where('id', 'lycee-test')
            ->update(['group_id' => $group->id]);
    }
}
