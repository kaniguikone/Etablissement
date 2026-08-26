<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\FraisAnnexe;
use App\Models\Niveau;
use App\Models\Paiement;
use App\Models\Parents;
use App\Models\Scolarites;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class ParentCinetPayTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    private Parents $parent;
    private Eleve $monEnfant;
    private Eleve $autreEnfant;
    private Scolarites $scolarite;
    private FraisAnnexe $frais;

    protected function setUp(): void
    {
        parent::setUp();

        $niveau = $this->creerNiveau('5ème', '5e');
        $classe = $this->creerClasse($niveau->id, '5ème A', '5A');

        $this->parent     = $this->creerParent('PAR-MOI');
        $this->monEnfant  = $this->creerEleve($classe->id, 'ELV-MOI', 'BAMBA', 'Seydou', $this->parent->id);
        $this->autreEnfant = $this->creerEleve($classe->id, 'ELV-AUTRE', 'KONE', 'Awa');

        $this->scolarite = Scolarites::create([
            'libelle_echeance' => '1ère tranche',
            'date_echeance'    => '2026-10-31',
            'montant_echeance' => '80000',
            'niveau_id'        => $niveau->id,
        ]);

        $this->frais = FraisAnnexe::create([
            'nom'      => 'Tenue scolaire',
            'categorie'=> 'tenue',
            'montant'  => 15000,
            'annee'    => '2026-2027',
            'obligatoire' => true,
        ]);

        $this->actingAs($this->parent, 'sanctum');
    }

    /** @test */
    public function un_parent_peut_initier_un_paiement_de_scolarite_pour_son_enfant(): void
    {
        Http::fake([
            '*/payment' => Http::response([
                'code' => '201',
                'data' => ['payment_url' => 'https://checkout.cinetpay.com/xyz'],
            ]),
        ]);

        $response = $this->postJson("/api/parent/enfant/{$this->monEnfant->id}/paiements/initier", [
            'scolarite_id' => $this->scolarite->id,
            'montant'      => 80000,
            'return_url'   => 'https://ecole.test/PaiementRetour',
        ]);

        $response->assertStatus(200)->assertJsonStructure(['payment_url', 'transaction_id']);
        $this->assertDatabaseHas('paiements', [
            'eleve_id'      => $this->monEnfant->id,
            'mode_paiement' => 'cinetpay',
            'statut_cinetpay' => 'pending',
        ]);
    }

    /** @test */
    public function un_parent_ne_peut_pas_initier_un_paiement_pour_un_enfant_qui_nest_pas_le_sien(): void
    {
        $response = $this->postJson("/api/parent/enfant/{$this->autreEnfant->id}/paiements/initier", [
            'scolarite_id' => $this->scolarite->id,
            'montant'      => 80000,
            'return_url'   => 'https://ecole.test/PaiementRetour',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('paiements', ['eleve_id' => $this->autreEnfant->id]);
    }

    /** @test */
    public function un_parent_peut_consulter_le_statut_de_son_propre_paiement(): void
    {
        $paiement = Paiement::create([
            'eleve_id'        => $this->monEnfant->id,
            'scolarite_id'    => $this->scolarite->id,
            'montant_paye'    => 80000,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'cinetpay',
            'transaction_id'  => 'SCOL-PARENT-1',
            'statut_cinetpay' => 'pending',
        ]);

        Http::fake(['*/payment/check' => Http::response(['data' => ['status' => 'ACCEPTED']])]);

        $this->getJson('/api/parent/paiements/statut/SCOL-PARENT-1')
             ->assertStatus(200)
             ->assertJsonPath('statut_cinetpay', 'paid');

        $this->assertEquals('paid', $paiement->fresh()->statut_cinetpay);
    }

    /** @test */
    public function un_parent_ne_peut_pas_consulter_le_statut_dun_paiement_dun_autre_enfant(): void
    {
        Paiement::create([
            'eleve_id'        => $this->autreEnfant->id,
            'scolarite_id'    => $this->scolarite->id,
            'montant_paye'    => 80000,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'cinetpay',
            'transaction_id'  => 'SCOL-AUTRE-1',
            'statut_cinetpay' => 'pending',
        ]);

        Http::fake();

        $this->getJson('/api/parent/paiements/statut/SCOL-AUTRE-1')->assertStatus(404);
        Http::assertNothingSent();
    }

    /** @test */
    public function un_parent_peut_initier_un_paiement_de_frais_annexe_pour_son_enfant(): void
    {
        Http::fake([
            '*/payment' => Http::response([
                'code' => '201',
                'data' => ['payment_url' => 'https://checkout.cinetpay.com/frais'],
            ]),
        ]);

        $response = $this->postJson("/api/parent/enfant/{$this->monEnfant->id}/frais-annexes/initier", [
            'frais_annexe_id' => $this->frais->id,
            'return_url'      => 'https://ecole.test/PaiementRetour',
        ]);

        $response->assertStatus(200)->assertJsonStructure(['payment_url', 'transaction_id']);
        $this->assertDatabaseHas('paiements_frais_annexes', [
            'eleve_id'        => $this->monEnfant->id,
            'frais_annexe_id' => $this->frais->id,
            'montant_paye'    => 15000,
            'statut_cinetpay' => 'pending',
        ]);
    }

    /** @test */
    public function un_parent_voit_le_recap_des_frais_annexes_de_son_enfant(): void
    {
        $response = $this->getJson("/api/parent/enfant/{$this->monEnfant->id}/frais-annexes");

        $response->assertStatus(200)
                 ->assertJsonPath('recap.0.frais_id', $this->frais->id)
                 ->assertJsonPath('recap.0.statut', 'impayé');
    }
}
