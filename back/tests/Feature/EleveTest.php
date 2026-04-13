<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Niveau;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class EleveTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    private function setup_classe(): Classe
    {
        $niveau = $this->creerNiveau('CM2', 'CM2');
        return $this->creerClasse($niveau->id, 'CM2 A', 'CM2A');
    }

    /** @test */
    public function liste_des_eleves_retourne_200(): void
    {
        $response = $this->getJson('/api/eleves');
        $response->assertStatus(200)
                 ->assertJsonStructure(['data', 'total', 'current_page']);
    }

    /** @test */
    public function creation_eleve_valide(): void
    {
        $classe = $this->setup_classe();
        $parent = $this->creerParent();

        $response = $this->postJson('/api/eleves', [
            'matricule_eleve'      => 'MAT001',
            'nom_eleve'            => 'KONÉ',
            'prenoms_eleve'        => 'Aminata',
            'date_naissance_eleve' => '2012-05-15',
            'classe_id'            => $classe->id,
            'parent_id'            => $parent->id,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('eleve.matricule_eleve', 'MAT001')
                 ->assertJsonPath('eleve.nom_eleve', 'KONÉ');

        $this->assertDatabaseHas('eleves', ['matricule_eleve' => 'MAT001']);
    }

    /** @test */
    public function creation_eleve_sans_matricule_retourne_erreur(): void
    {
        $classe = $this->setup_classe();
        $parent = $this->creerParent('PAR002');

        $response = $this->postJson('/api/eleves', [
            'nom_eleve'            => 'KONÉ',
            'prenoms_eleve'        => 'Aminata',
            'date_naissance_eleve' => '2012-05-15',
            'classe_id'            => $classe->id,
            'parent_id'            => $parent->id,
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['matricule_eleve']);
    }

    /** @test */
    public function modification_eleve_existant(): void
    {
        $classe = $this->setup_classe();
        $eleve  = $this->creerEleve($classe->id, 'MAT002', 'TRAORÉ', 'Issa');

        $response = $this->putJson("/api/eleves/{$eleve->id}", [
            'matricule_eleve'      => 'MAT002',
            'nom_eleve'            => 'TRAORÉ',
            'prenoms_eleve'        => 'Moussa',
            'date_naissance_eleve' => '2011-03-10',
            'classe_id'            => $classe->id,
            'parent_id'            => $eleve->parent_id,
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'success')
                 ->assertJsonPath('eleve.prenoms_eleve', 'Moussa');

        $this->assertDatabaseHas('eleves', ['prenoms_eleve' => 'Moussa']);
    }

    /** @test */
    public function suppression_eleve_existant(): void
    {
        $classe  = $this->setup_classe();
        $eleve   = $this->creerEleve($classe->id, 'MAT003', 'BA', 'Fatou');
        $eleveId = $eleve->id;

        $this->deleteJson("/api/eleves/{$eleveId}")->assertStatus(200);
        $this->assertDatabaseMissing('eleves', ['id' => $eleveId]);
    }
}
