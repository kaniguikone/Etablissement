<?php

namespace Tests\Feature;

use App\Models\SanteEleve;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class SanteEleveTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    private $eleve;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();

        $niveau      = $this->creerNiveau('6ème', '6e');
        $classe      = $this->creerClasse($niveau->id, '6ème A', '6A');
        $this->eleve = $this->creerEleve($classe->id, 'ELV200', 'TRAORE', 'Aminata');
    }

    /** @test */
    public function fiche_sante_absente_retourne_sante_null(): void
    {
        $response = $this->getJson("/api/sante-eleves/{$this->eleve->id}");

        $response->assertStatus(200)
                 ->assertJsonStructure(['eleve', 'sante'])
                 ->assertJsonPath('sante', null);
    }

    /** @test */
    public function creation_fiche_sante(): void
    {
        $response = $this->putJson("/api/sante-eleves/{$this->eleve->id}", [
            'groupe_sanguin'            => 'O+',
            'allergies'                 => 'Arachides',
            'contact_urgence_nom'       => 'Fatou Traoré',
            'contact_urgence_lien'      => 'Mère',
            'contact_urgence_telephone' => '0102030405',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('groupe_sanguin', 'O+')
                 ->assertJsonPath('allergies', 'Arachides');

        // Chiffré au repos : on vérifie via le modèle (déchiffrement transparent),
        // pas la colonne brute qui contient désormais un blob chiffré.
        $this->assertSame('O+', SanteEleve::where('eleve_id', $this->eleve->id)->first()->groupe_sanguin);
    }

    /** @test */
    public function modification_fiche_sante_existante_ne_duplique_pas(): void
    {
        SanteEleve::create([
            'eleve_id'       => $this->eleve->id,
            'groupe_sanguin' => 'A+',
        ]);

        $this->putJson("/api/sante-eleves/{$this->eleve->id}", [
            'groupe_sanguin' => 'B+',
        ])->assertStatus(200)->assertJsonPath('groupe_sanguin', 'B+');

        $this->assertDatabaseCount('sante_eleves', 1);
    }

    /** @test */
    public function fiche_sante_eleve_inexistant_retourne_404(): void
    {
        $this->getJson('/api/sante-eleves/999999')->assertStatus(404);
    }
}
