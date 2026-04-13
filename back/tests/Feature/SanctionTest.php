<?php

namespace Tests\Feature;

use App\Models\Sanction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class SanctionTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    private $eleve;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();

        $niveau       = $this->creerNiveau('6ème', '6e');
        $classe       = $this->creerClasse($niveau->id, '6ème A', '6A');
        $this->eleve  = $this->creerEleve($classe->id, 'ELV100', 'COULIBALY', 'Mamadou');
    }

    /** @test */
    public function liste_sanctions_retourne_200(): void
    {
        $response = $this->getJson('/api/sanctions');
        $response->assertStatus(200)
                 ->assertJsonStructure(['data', 'total', 'current_page']);
    }

    /** @test */
    public function creation_sanction_valide(): void
    {
        $response = $this->postJson('/api/sanctions', [
            'eleve_id'      => $this->eleve->id,
            'type'          => 'avertissement',
            'motif'         => 'Retard répété',
            'date_sanction' => '2026-03-10',
            'prononcee_par' => 'M. Koné',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('type', 'avertissement')
                 ->assertJsonPath('eleve_id', $this->eleve->id);

        $this->assertDatabaseHas('sanctions', [
            'eleve_id' => $this->eleve->id,
            'type'     => 'avertissement',
        ]);
    }

    /** @test */
    public function creation_sanction_type_invalide(): void
    {
        $response = $this->postJson('/api/sanctions', [
            'eleve_id'      => $this->eleve->id,
            'type'          => 'type_inexistant',
            'motif'         => 'Test',
            'date_sanction' => '2026-03-10',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['type']);
    }

    /** @test */
    public function sanction_sans_eleve_retourne_erreur(): void
    {
        $response = $this->postJson('/api/sanctions', [
            'type'          => 'blame',
            'motif'         => 'Test',
            'date_sanction' => '2026-03-10',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['eleve_id']);
    }

    /** @test */
    public function modification_sanction(): void
    {
        $sanction = Sanction::create([
            'eleve_id'      => $this->eleve->id,
            'type'          => 'avertissement',
            'motif'         => 'Motif initial',
            'date_sanction' => '2026-03-01',
        ]);

        $response = $this->putJson("/api/sanctions/{$sanction->id}", [
            'eleve_id'      => $this->eleve->id,
            'type'          => 'blame',
            'motif'         => 'Motif modifié',
            'date_sanction' => '2026-03-01',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('type', 'blame')
                 ->assertJsonPath('motif', 'Motif modifié');
    }

    /** @test */
    public function suppression_sanction(): void
    {
        $sanction = Sanction::create([
            'eleve_id'      => $this->eleve->id,
            'type'          => 'convocation',
            'motif'         => 'À supprimer',
            'date_sanction' => '2026-02-15',
        ]);

        $this->deleteJson("/api/sanctions/{$sanction->id}")->assertStatus(204);
        $this->assertDatabaseMissing('sanctions', ['id' => $sanction->id]);
    }

    /** @test */
    public function sanctions_par_eleve_retourne_statistiques(): void
    {
        Sanction::create([
            'eleve_id'       => $this->eleve->id,
            'type'           => 'avertissement',
            'motif'          => 'Bavardage',
            'date_sanction'  => '2026-01-10',
            'parent_notifie' => false,
        ]);
        Sanction::create([
            'eleve_id'       => $this->eleve->id,
            'type'           => 'blame',
            'motif'          => 'Insolence',
            'date_sanction'  => '2026-02-20',
            'parent_notifie' => true,
        ]);

        $response = $this->getJson("/api/sanctions/eleve/{$this->eleve->id}");

        $response->assertStatus(200)
                 ->assertJsonStructure(['eleve', 'sanctions', 'stats'])
                 ->assertJsonPath('stats.total', 2)
                 ->assertJsonPath('stats.non_notifies', 1);
    }

    /** @test */
    public function notifier_parent_marque_la_sanction(): void
    {
        $sanction = Sanction::create([
            'eleve_id'       => $this->eleve->id,
            'type'           => 'exclusion_temp',
            'motif'          => 'Violence',
            'date_sanction'  => '2026-03-05',
            'parent_notifie' => false,
        ]);

        $response = $this->postJson("/api/sanctions/{$sanction->id}/notifier");

        $response->assertStatus(200)
                 ->assertJsonStructure(['message']);

        // Vérifier que parent_notifie est bien mis à jour en DB
        $this->assertDatabaseHas('sanctions', [
            'id'             => $sanction->id,
            'parent_notifie' => 1, // SQLite stocke les booléens comme 0/1
        ]);
    }

    /** @test */
    public function filtre_sanctions_par_type(): void
    {
        Sanction::create([
            'eleve_id'      => $this->eleve->id,
            'type'          => 'avertissement',
            'motif'         => 'Test 1',
            'date_sanction' => '2026-01-01',
        ]);
        Sanction::create([
            'eleve_id'      => $this->eleve->id,
            'type'          => 'blame',
            'motif'         => 'Test 2',
            'date_sanction' => '2026-01-02',
        ]);

        $response = $this->getJson('/api/sanctions?type=avertissement');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('avertissement', $data[0]['type']);
    }
}
