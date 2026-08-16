<?php

namespace Tests\Feature;

use App\Models\Eleve;
use App\Models\Parents;
use App\Models\SanteEleve;
use App\Services\AnonymisationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class AnonymisationServiceTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    private AnonymisationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
        $this->service = new AnonymisationService();
    }

    /** @test */
    public function anonymiser_eleve_efface_les_donnees_identifiantes(): void
    {
        $niveau = $this->creerNiveau('6ème', '6e');
        $classe = $this->creerClasse($niveau->id, '6ème A', '6A');
        $eleve  = $this->creerEleve($classe->id, 'ELV300', 'KOFFI', 'Jean');

        SanteEleve::create(['eleve_id' => $eleve->id, 'groupe_sanguin' => 'O+']);

        $this->service->anonymiserEleve($eleve->id);

        $eleve->refresh();
        $this->assertSame('Anonymisé', $eleve->nom_eleve);
        $this->assertSame('', $eleve->prenoms_eleve);
        $this->assertNull($eleve->adresse_eleve);
        $this->assertNull($eleve->parent_id);
        // Champs conservés (référence interne / stats)
        $this->assertSame('ELV300', $eleve->matricule_eleve);
        $this->assertSame($classe->id, $eleve->classe_id);

        $this->assertDatabaseMissing('sante_eleves', ['eleve_id' => $eleve->id]);
    }

    /** @test */
    public function anonymiser_parent_libere_le_numero_et_efface_les_coordonnees(): void
    {
        $parent = $this->creerParent('0102030405');
        $parent->update(['email_parent' => 'parent@test.com', 'adresse_parent' => 'Cocody']);

        $this->service->anonymiserParent($parent->id);

        $parent->refresh();
        $this->assertSame('Anonymisé', $parent->nom_parent);
        $this->assertNull($parent->email_parent);
        $this->assertNull($parent->adresse_parent);
        $this->assertNotSame('0102030405', $parent->numero_parent);
        $this->assertStringStartsWith('ANON-', $parent->numero_parent);

        // Le numéro d'origine redevient disponible pour un autre parent
        $this->assertDatabaseHas('parents', ['id' => $parent->id]);
        Parents::create(['numero_parent' => '0102030405', 'nom_parent' => 'Autre']);
        $this->assertDatabaseCount('parents', 2);
    }
}
