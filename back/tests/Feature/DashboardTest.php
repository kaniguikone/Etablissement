<?php

namespace Tests\Feature;

use App\Models\Enseignant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    /** @test */
    public function stats_retourne_les_compteurs_corrects(): void
    {
        $niveau = $this->creerNiveau('CP', 'CP');
        $classe = $this->creerClasse($niveau->id, 'CP A', 'CPA');
        $this->creerEleve($classe->id, 'E001', 'Test', 'Eleve');

        Enseignant::create([
            'matricule_enseignant' => 'ENS001',
            'nom_enseignant'       => 'Test',
            'prenoms_enseignant'   => 'Enseignant',
        ]);

        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'total_eleves',
                     'total_enseignants',
                     'total_classes',
                     'total_matieres',
                     'absences_semaine',
                     'retards_semaine',
                     'devoirs_recents',
                     'informations_recentes',
                 ])
                 ->assertJsonPath('total_eleves', 1)
                 ->assertJsonPath('total_enseignants', 1)
                 ->assertJsonPath('total_classes', 1);
    }
}
