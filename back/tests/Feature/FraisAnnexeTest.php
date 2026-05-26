<?php

namespace Tests\Feature;

use App\Models\FraisAnnexe;
use App\Models\PaiementFraisAnnexe;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class FraisAnnexeTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    // ── Configuration des frais ───────────────────────────────────────────────

    /** @test */
    public function creer_un_frais_annexe_valide(): void
    {
        $niveau = $this->creerNiveau('6ème', '6e');

        $response = $this->postJson('/api/frais-annexes', [
            'nom'         => 'Tenue scolaire',
            'categorie'   => 'tenue',
            'montant'     => 25000,
            'annee'       => '2025-2026',
            'niveau_id'   => $niveau->id,
            'obligatoire' => true,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('nom', 'Tenue scolaire');
        $this->assertEquals(25000.0, (float) $response->json('montant'));

        $this->assertDatabaseHas('frais_annexes', [
            'nom'    => 'Tenue scolaire',
            'annee'  => '2025-2026',
        ]);
    }

    /** @test */
    public function creer_frais_annexe_sans_niveau_sapplique_a_tous(): void
    {
        $response = $this->postJson('/api/frais-annexes', [
            'nom'         => 'Cotisation APES',
            'categorie'   => 'apes',
            'montant'     => 5000,
            'annee'       => '2025-2026',
            'obligatoire' => true,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('niveau_id', null);
    }

    /** @test */
    public function rejet_frais_annexe_categorie_invalide(): void
    {
        $response = $this->postJson('/api/frais-annexes', [
            'nom'       => 'Test',
            'categorie' => 'invalide',
            'montant'   => 10000,
            'annee'     => '2025-2026',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['categorie']);
    }

    /** @test */
    public function modifier_un_frais_annexe(): void
    {
        $frais = FraisAnnexe::create([
            'nom'       => 'Vieux nom',
            'categorie' => 'autre',
            'montant'   => 10000,
            'annee'     => '2025-2026',
        ]);

        $response = $this->putJson("/api/frais-annexes/{$frais->id}", [
            'nom'       => 'Nouveau nom',
            'categorie' => 'autre',
            'montant'   => 15000,
            'annee'     => '2025-2026',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('nom', 'Nouveau nom');
        $this->assertEquals(15000.0, (float) $response->json('montant'));
    }

    /** @test */
    public function supprimer_un_frais_annexe(): void
    {
        $frais = FraisAnnexe::create([
            'nom'       => 'À supprimer',
            'categorie' => 'autre',
            'montant'   => 5000,
            'annee'     => '2025-2026',
        ]);

        $this->deleteJson("/api/frais-annexes/{$frais->id}")->assertStatus(204);
        $this->assertDatabaseMissing('frais_annexes', ['id' => $frais->id]);
    }

    /** @test */
    public function lister_frais_filtres_par_annee(): void
    {
        FraisAnnexe::create(['nom' => 'Frais A', 'categorie' => 'autre', 'montant' => 5000, 'annee' => '2025-2026']);
        FraisAnnexe::create(['nom' => 'Frais B', 'categorie' => 'autre', 'montant' => 5000, 'annee' => '2024-2025']);

        $response = $this->getJson('/api/frais-annexes?annee=2025-2026');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertEquals('Frais A', $data[0]['nom']);
    }

    // ── Paiements par élève ───────────────────────────────────────────────────

    /** @test */
    public function vue_frais_par_eleve_retourne_structure_correcte(): void
    {
        $niveau = $this->creerNiveau('5ème', '5e');
        $classe = $this->creerClasse($niveau->id, '5ème A', '5A');
        $eleve  = $this->creerEleve($classe->id, 'ELV001', 'KONE', 'Moussa');

        FraisAnnexe::create([
            'nom'         => 'Tenue',
            'categorie'   => 'tenue',
            'montant'     => 20000,
            'annee'       => '2025-2026',
            'obligatoire' => true,
        ]);

        $response = $this->getJson("/api/frais-annexes/eleve/{$eleve->id}?annee=2025-2026");

        $response->assertStatus(200)
                 ->assertJsonStructure(['eleve', 'recap', 'paiements', 'total_du', 'total_paye', 'solde']);

        $this->assertEquals(20000.0, $response->json('total_du'));
        $this->assertEquals(0.0,     $response->json('total_paye'));
        $this->assertEquals(20000.0, $response->json('solde'));
    }

    /** @test */
    public function vue_frais_par_eleve_calcule_solde_apres_paiement_partiel(): void
    {
        $niveau = $this->creerNiveau('4ème', '4e');
        $classe = $this->creerClasse($niveau->id, '4ème A', '4A');
        $eleve  = $this->creerEleve($classe->id, 'ELV002', 'DIALLO', 'Ibrahim');

        $frais = FraisAnnexe::create([
            'nom'         => 'Manuel',
            'categorie'   => 'manuel',
            'montant'     => 30000,
            'annee'       => '2025-2026',
            'obligatoire' => true,
        ]);

        PaiementFraisAnnexe::create([
            'eleve_id'        => $eleve->id,
            'frais_annexe_id' => $frais->id,
            'montant_paye'    => 10000,
            'date_paiement'   => '2025-10-01',
            'mode_paiement'   => 'especes',
        ]);

        $response = $this->getJson("/api/frais-annexes/eleve/{$eleve->id}?annee=2025-2026");

        $response->assertStatus(200);
        $this->assertEquals(30000.0, $response->json('total_du'));
        $this->assertEquals(10000.0, $response->json('total_paye'));
        $this->assertEquals(20000.0, $response->json('solde'));

        $recap = collect($response->json('recap'))->firstWhere('frais_id', $frais->id);
        $this->assertEquals('partiel', $recap['statut']);
    }

    // ── Enregistrement paiement ───────────────────────────────────────────────

    /** @test */
    public function enregistrer_paiement_frais_annexe_valide(): void
    {
        $niveau = $this->creerNiveau('3ème', '3e');
        $classe = $this->creerClasse($niveau->id, '3ème A', '3A');
        $eleve  = $this->creerEleve($classe->id, 'ELV003', 'OUATTARA', 'Fatou');

        $frais = FraisAnnexe::create([
            'nom'       => 'Examen',
            'categorie' => 'examen',
            'montant'   => 15000,
            'annee'     => '2025-2026',
        ]);

        $response = $this->postJson('/api/paiements-frais-annexes', [
            'eleve_id'        => $eleve->id,
            'frais_annexe_id' => $frais->id,
            'montant_paye'    => 15000,
            'date_paiement'   => '2025-11-15',
            'mode_paiement'   => 'especes',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('paiements_frais_annexes', [
            'eleve_id'        => $eleve->id,
            'frais_annexe_id' => $frais->id,
            'montant_paye'    => 15000,
        ]);
    }

    /** @test */
    public function rejet_paiement_frais_annexe_mode_invalide(): void
    {
        $niveau = $this->creerNiveau('2nde', '2nd');
        $classe = $this->creerClasse($niveau->id, '2nde A', '2A');
        $eleve  = $this->creerEleve($classe->id, 'ELV004', 'BAMBA', 'Ali');

        $frais = FraisAnnexe::create([
            'nom'       => 'Transport',
            'categorie' => 'transport',
            'montant'   => 40000,
            'annee'     => '2025-2026',
        ]);

        $response = $this->postJson('/api/paiements-frais-annexes', [
            'eleve_id'        => $eleve->id,
            'frais_annexe_id' => $frais->id,
            'montant_paye'    => 40000,
            'date_paiement'   => '2025-11-15',
            'mode_paiement'   => 'carte_bancaire',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['mode_paiement']);
    }

    /** @test */
    public function supprimer_paiement_frais_annexe(): void
    {
        $niveau = $this->creerNiveau('1ère', '1er');
        $classe = $this->creerClasse($niveau->id, '1ère A', '1A');
        $eleve  = $this->creerEleve($classe->id, 'ELV005', 'COULIBALY', 'Awa');

        $frais = FraisAnnexe::create([
            'nom'       => 'Activité',
            'categorie' => 'activite',
            'montant'   => 5000,
            'annee'     => '2025-2026',
        ]);

        $paiement = PaiementFraisAnnexe::create([
            'eleve_id'        => $eleve->id,
            'frais_annexe_id' => $frais->id,
            'montant_paye'    => 5000,
            'date_paiement'   => '2025-10-10',
            'mode_paiement'   => 'especes',
        ]);

        $this->deleteJson("/api/paiements-frais-annexes/{$paiement->id}")->assertStatus(204);
        $this->assertDatabaseMissing('paiements_frais_annexes', ['id' => $paiement->id]);
    }

    // ── Impayés ───────────────────────────────────────────────────────────────

    /** @test */
    public function impayes_liste_les_eleves_avec_solde(): void
    {
        $niveau = $this->creerNiveau('Terminale', 'Tle');
        $classe = $this->creerClasse($niveau->id, 'Tle A', 'TleA');
        $eleve  = $this->creerEleve($classe->id, 'ELV006', 'TRAORE', 'Moussa');

        FraisAnnexe::create([
            'nom'         => 'Tenue Tle',
            'categorie'   => 'tenue',
            'montant'     => 20000,
            'annee'       => '2025-2026',
            'niveau_id'   => $niveau->id,
            'obligatoire' => true,
        ]);

        $response = $this->getJson('/api/frais-annexes/impayes?annee=2025-2026');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data', 'count', 'total_impayes']);

        $this->assertEquals(1, $response->json('count'));
        $this->assertEquals(20000.0, $response->json('total_impayes'));
    }

    /** @test */
    public function impayes_exclut_eleves_soldes(): void
    {
        $niveau = $this->creerNiveau('CM2', 'CM2');
        $classe = $this->creerClasse($niveau->id, 'CM2 A', 'CM2A');
        $eleve  = $this->creerEleve($classe->id, 'ELV007', 'KOFFI', 'Yao');

        $frais = FraisAnnexe::create([
            'nom'         => 'Manuel CM2',
            'categorie'   => 'manuel',
            'montant'     => 12000,
            'annee'       => '2025-2026',
            'niveau_id'   => $niveau->id,
            'obligatoire' => true,
        ]);

        // Payer en totalité → soldé
        PaiementFraisAnnexe::create([
            'eleve_id'        => $eleve->id,
            'frais_annexe_id' => $frais->id,
            'montant_paye'    => 12000,
            'date_paiement'   => '2025-10-01',
            'mode_paiement'   => 'especes',
        ]);

        $response = $this->getJson('/api/frais-annexes/impayes?annee=2025-2026');

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('count'));
        $this->assertEquals(0.0, $response->json('total_impayes'));
    }

    /** @test */
    public function impayes_frais_non_obligatoires_exclus(): void
    {
        $niveau = $this->creerNiveau('CM1', 'CM1');
        $classe = $this->creerClasse($niveau->id, 'CM1 A', 'CM1A');
        $this->creerEleve($classe->id, 'ELV008', 'SORO', 'Brice');

        FraisAnnexe::create([
            'nom'         => 'Cantine optionnelle',
            'categorie'   => 'cantine',
            'montant'     => 50000,
            'annee'       => '2025-2026',
            'niveau_id'   => $niveau->id,
            'obligatoire' => false,
        ]);

        $response = $this->getJson('/api/frais-annexes/impayes?annee=2025-2026');

        $response->assertStatus(200)
                 ->assertJsonPath('count', 0);
    }
}
