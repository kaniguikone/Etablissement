<?php

namespace Tests\Feature;

use App\Models\EvenementCalendrier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendrierTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    /** @test */
    public function liste_evenements_retourne_200(): void
    {
        $response = $this->getJson('/api/calendrier?annee=2026&mois=3');
        $response->assertStatus(200)
                 ->assertJsonIsArray();
    }

    /** @test */
    public function creation_evenement_valide(): void
    {
        $response = $this->postJson('/api/calendrier', [
            'titre'       => 'Conseil de classe',
            'type'        => 'reunion',
            'date_debut'  => '2026-03-15',
            'date_fin'    => '2026-03-15',
            'couleur'     => '#3b82f6',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('titre', 'Conseil de classe')
                 ->assertJsonPath('type', 'reunion');

        $this->assertDatabaseHas('evenements_calendrier', ['titre' => 'Conseil de classe']);
    }

    /** @test */
    public function creation_evenement_type_invalide(): void
    {
        $response = $this->postJson('/api/calendrier', [
            'titre'      => 'Test',
            'type'       => 'type_inexistant',
            'date_debut' => '2026-03-15',
            'date_fin'   => '2026-03-15',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['type']);
    }

    /** @test */
    public function creation_evenement_sans_titre(): void
    {
        $response = $this->postJson('/api/calendrier', [
            'type'       => 'conge',
            'date_debut' => '2026-04-01',
            'date_fin'   => '2026-04-10',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['titre']);
    }

    /** @test */
    public function modification_evenement(): void
    {
        $evt = EvenementCalendrier::create([
            'titre'      => 'Réunion parents',
            'type'       => 'reunion',
            'date_debut' => '2026-04-20',
            'date_fin'   => '2026-04-20',
            'couleur'    => '#3b82f6',
        ]);

        $response = $this->putJson("/api/calendrier/{$evt->id}", [
            'titre'      => 'Réunion parents modifiée',
            'type'       => 'reunion',
            'date_debut' => '2026-04-21',
            'date_fin'   => '2026-04-21',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('titre', 'Réunion parents modifiée');
    }

    /** @test */
    public function suppression_evenement(): void
    {
        $evt = EvenementCalendrier::create([
            'titre'      => 'À supprimer',
            'type'       => 'autre',
            'date_debut' => '2026-05-01',
            'date_fin'   => '2026-05-01',
        ]);

        $this->deleteJson("/api/calendrier/{$evt->id}")->assertStatus(204);
        $this->assertDatabaseMissing('evenements_calendrier', ['id' => $evt->id]);
    }

    /** @test */
    public function filtre_par_mois_retourne_evenements_du_mois(): void
    {
        // Événement en mars
        EvenementCalendrier::create([
            'titre'      => 'Exam mars',
            'type'       => 'examen',
            'date_debut' => '2026-03-10',
            'date_fin'   => '2026-03-20',
        ]);

        // Événement en mai (hors mois filtré)
        EvenementCalendrier::create([
            'titre'      => 'Exam mai',
            'type'       => 'examen',
            'date_debut' => '2026-05-10',
            'date_fin'   => '2026-05-15',
        ]);

        $response = $this->getJson('/api/calendrier?annee=2026&mois=3');
        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(1, $data);
        $this->assertEquals('Exam mars', $data[0]['titre']);
    }

    /** @test */
    public function filtre_par_type(): void
    {
        EvenementCalendrier::create([
            'titre' => 'Congé Pâques', 'type' => 'conge',
            'date_debut' => '2026-03-01', 'date_fin' => '2026-03-07',
        ]);
        EvenementCalendrier::create([
            'titre' => 'Examen Brevet', 'type' => 'examen',
            'date_debut' => '2026-03-15', 'date_fin' => '2026-03-17',
        ]);

        $response = $this->getJson('/api/calendrier?annee=2026&mois=3&type=conge');
        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(1, $data);
        $this->assertEquals('conge', $data[0]['type']);
    }
}
