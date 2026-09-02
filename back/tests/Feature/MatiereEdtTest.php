<?php

namespace Tests\Feature;

use App\Models\Matiere;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Chantier EDT — Lot 0.1 : champs famille / couleur / salle requise / effort
 * soutenu sur les matières, et non-régression du CRUD matière existant.
 */
class MatiereEdtTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    /** @test */
    public function creation_matiere_sans_champs_edt_reste_possible(): void
    {
        $this->postJson('/api/matieres', [
            'abbr_matiere' => 'MATHS',
            'libelle_matiere' => 'Mathématiques',
            'description_matiere' => 'Test',
        ])->assertStatus(201);

        $this->assertDatabaseHas('matieres', ['abbr_matiere' => 'MATHS', 'famille' => null]);
    }

    /** @test */
    public function creation_matiere_avec_champs_edt(): void
    {
        $this->postJson('/api/matieres', [
            'abbr_matiere' => 'SPC',
            'libelle_matiere' => 'Sciences Physiques et Chimie',
            'description_matiere' => 'Test',
            'famille' => 'pc',
            'couleur' => '#68D391',
            'salle_type_requis' => 'labo',
            'effort_soutenu' => true,
        ])->assertStatus(201);

        $this->assertDatabaseHas('matieres', [
            'abbr_matiere' => 'SPC',
            'famille' => 'pc',
            'salle_type_requis' => 'labo',
            'effort_soutenu' => true,
        ]);
    }

    /** @test */
    public function famille_invalide_rejetee(): void
    {
        $this->postJson('/api/matieres', [
            'abbr_matiere' => 'X',
            'libelle_matiere' => 'X',
            'description_matiere' => 'X',
            'famille' => 'physique_quantique',
        ])->assertStatus(422);
    }

    /** @test */
    public function mise_a_jour_ajoute_les_champs_edt(): void
    {
        $matiere = Matiere::create([
            'abbr_matiere' => 'EPS', 'libelle_matiere' => 'EPS', 'description_matiere' => 'Test',
        ]);

        $this->putJson("/api/matieres/{$matiere->id}", [
            'abbr_matiere' => 'EPS',
            'libelle_matiere' => 'EPS',
            'description_matiere' => 'Test',
            'famille' => 'eps',
            'salle_type_requis' => 'gymnase',
        ])->assertStatus(200);

        $this->assertDatabaseHas('matieres', ['id' => $matiere->id, 'famille' => 'eps', 'salle_type_requis' => 'gymnase']);
    }

    /** @test */
    public function endpoint_familles_retourne_le_referentiel(): void
    {
        $this->getJson('/api/matieres/familles')
            ->assertStatus(200)
            ->assertJsonStructure(['familles' => [['code', 'libelle', 'couleur']], 'types_salle', 'suggestions'])
            ->assertJsonPath('suggestions.SPC', 'pc');
    }

    /** @test */
    public function seeder_familles_deduit_la_famille_depuis_abbr(): void
    {
        Matiere::create(['abbr_matiere' => 'SVT', 'libelle_matiere' => 'SVT', 'description_matiere' => 'x']);
        Matiere::create(['abbr_matiere' => 'ZZZ', 'libelle_matiere' => 'Inconnue', 'description_matiere' => 'x']);

        $this->seed(\Database\Seeders\MatiereFamilleSeeder::class);

        $this->assertDatabaseHas('matieres', ['abbr_matiere' => 'SVT', 'famille' => 'svt', 'salle_type_requis' => 'labo']);
        $this->assertDatabaseHas('matieres', ['abbr_matiere' => 'ZZZ', 'famille' => null]);
    }
}
