<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Niveau;
use App\Models\Paiement;
use App\Models\Scolarites;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class PaiementTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    private Eleve $eleve;
    private Scolarites $scolarite;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();

        $niveau = $this->creerNiveau('5ème', '5e');
        $classe = $this->creerClasse($niveau->id, '5ème A', '5A');

        $this->eleve = $this->creerEleve($classe->id, 'ELV001', 'BAMBA', 'Seydou');

        $this->scolarite = Scolarites::create([
            'libelle_echeance' => '1ère tranche',
            'date_echeance'    => '2026-10-31',
            'montant_echeance' => '80000',
            'niveau_id'        => $niveau->id,
        ]);
    }

    /** @test */
    public function enregistrer_un_paiement_valide(): void
    {
        $response = $this->postJson('/api/paiements', [
            'eleve_id'      => $this->eleve->id,
            'scolarite_id'  => $this->scolarite->id,
            'montant_paye'  => 80000,
            'date_paiement' => '2026-10-15',
            'mode_paiement' => 'especes',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('paiements', [
            'eleve_id'     => $this->eleve->id,
            'montant_paye' => 80000,
        ]);
    }

    /** @test */
    public function rejet_paiement_sans_montant(): void
    {
        $response = $this->postJson('/api/paiements', [
            'eleve_id'      => $this->eleve->id,
            'scolarite_id'  => $this->scolarite->id,
            'date_paiement' => '2026-10-15',
            'mode_paiement' => 'especes',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['montant_paye']);
    }

    /** @test */
    public function recap_eleve_retourne_solde_correct(): void
    {
        Paiement::create([
            'eleve_id'      => $this->eleve->id,
            'scolarite_id'  => $this->scolarite->id,
            'montant_paye'  => 50000,
            'date_paiement' => '2026-10-01',
            'mode_paiement' => 'especes',
        ]);

        $response = $this->getJson("/api/paiementsEleve/{$this->eleve->id}");

        $data = $response->assertStatus(200)->json();
        $this->assertEquals(80000.0, $data['total_du']);
        $this->assertEquals(50000.0, $data['total_paye']);
        $this->assertEquals(30000.0, $data['solde_restant']);
    }

    /** @test */
    public function suppression_paiement(): void
    {
        $paiement = Paiement::create([
            'eleve_id'      => $this->eleve->id,
            'scolarite_id'  => $this->scolarite->id,
            'montant_paye'  => 40000,
            'date_paiement' => '2026-09-15',
            'mode_paiement' => 'cheque',
        ]);

        $this->deleteJson("/api/paiements/{$paiement->id}")->assertStatus(204);
        $this->assertDatabaseMissing('paiements', ['id' => $paiement->id]);
    }

    /** @test */
    public function impayes_retourne_uniquement_les_eleves_avec_solde(): void
    {
        $response = $this->getJson('/api/impayes');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data', 'total_impayes', 'count'])
                 ->assertJsonPath('count', 1);

        $data = $response->json('data.0');
        $this->assertEquals($this->eleve->id, $data['eleve_id']);
        $this->assertEquals(80000.0, $data['total_du']);
        $this->assertEquals(0.0, $data['total_paye']);
        $this->assertEquals('impayé', $data['statut']);
    }

    /** @test */
    public function impayes_exclut_eleves_soldes(): void
    {
        Paiement::create([
            'eleve_id'      => $this->eleve->id,
            'scolarite_id'  => $this->scolarite->id,
            'montant_paye'  => 80000,
            'date_paiement' => '2026-10-01',
            'mode_paiement' => 'especes',
        ]);

        $response = $this->getJson('/api/impayes');

        $response->assertStatus(200)
                 ->assertJsonPath('count', 0);
    }

    /** @test */
    public function echeancier_retourne_structure_correcte(): void
    {
        $response = $this->getJson('/api/echeancier');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data',
                     'total_solde',
                     'nb_en_retard',
                     'nb_urgent',
                     'nb_a_venir',
                 ]);
    }

    /** @test */
    public function echeancier_inclut_echeances_en_retard(): void
    {
        // Échéance très ancienne — forcément en retard
        Scolarites::create([
            'libelle_echeance' => 'Tranche passée',
            'date_echeance'    => '2020-01-01',
            'montant_echeance' => '50000',
            'niveau_id'        => $this->eleve->classe->niveau_id,
        ]);

        $response = $this->getJson('/api/echeancier');

        $response->assertStatus(200);
        $nbRetard = $response->json('nb_en_retard');
        $this->assertGreaterThan(0, $nbRetard);
    }

    /** @test */
    public function export_csv_retourne_un_fichier_csv(): void
    {
        Paiement::create([
            'eleve_id'      => $this->eleve->id,
            'scolarite_id'  => $this->scolarite->id,
            'montant_paye'  => 80000,
            'date_paiement' => '2026-10-15',
            'mode_paiement' => 'especes',
        ]);

        $response = $this->getJson('/api/paiements/export');

        $response->assertStatus(200)
                 ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
}
