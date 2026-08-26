<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\FraisAnnexe;
use App\Models\Niveau;
use App\Models\Paiement;
use App\Models\PaiementFraisAnnexe;
use App\Models\Scolarites;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class CinetPayTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    private Eleve $eleve;
    private Scolarites $scolarite;
    private FraisAnnexe $frais;

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

        $this->frais = FraisAnnexe::create([
            'nom'         => 'Tenue scolaire',
            'categorie'   => 'tenue',
            'montant'     => 15000,
            'annee'       => '2026-2027',
            'obligatoire' => true,
        ]);
    }

    /** @test */
    public function initier_frais_annexe_cree_un_paiement_pending(): void
    {
        Http::fake([
            '*/payment' => Http::response([
                'code' => '201',
                'data' => ['payment_url' => 'https://checkout.cinetpay.com/frais-admin'],
            ]),
        ]);

        $response = $this->postJson('/api/paiements-frais-annexes/initier', [
            'eleve_id'        => $this->eleve->id,
            'frais_annexe_id' => $this->frais->id,
            'return_url'      => 'https://ecole.test/PaiementRetour',
        ]);

        $response->assertStatus(200)->assertJsonStructure(['payment_url', 'transaction_id']);
        $this->assertDatabaseHas('paiements_frais_annexes', [
            'eleve_id'        => $this->eleve->id,
            'frais_annexe_id' => $this->frais->id,
            'montant_paye'    => 15000,
            'mode_paiement'   => 'cinetpay',
            'statut_cinetpay' => 'pending',
        ]);
    }

    /** @test */
    public function notify_marque_un_paiement_de_frais_annexe_paid(): void
    {
        $paiement = PaiementFraisAnnexe::create([
            'eleve_id'        => $this->eleve->id,
            'frais_annexe_id' => $this->frais->id,
            'montant_paye'    => 15000,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'cinetpay',
            'transaction_id'  => 'FRAIS-NOTIFY-1',
            'statut_cinetpay' => 'pending',
        ]);

        Http::fake(['*/payment/check' => Http::response(['data' => ['status' => 'ACCEPTED']])]);

        $this->postJson('/api/paiements/notify', ['cpm_trans_id' => 'FRAIS-NOTIFY-1'])
             ->assertStatus(200);

        $this->assertEquals('paid', $paiement->fresh()->statut_cinetpay);
    }

    /** @test */
    public function initier_cree_un_paiement_pending_et_retourne_lurl_de_paiement(): void
    {
        Http::fake([
            '*/payment' => Http::response([
                'code'    => '201',
                'message' => 'CREATED',
                'data'    => ['payment_url' => 'https://checkout.cinetpay.com/abc123'],
            ]),
        ]);

        $response = $this->postJson('/api/paiements/initier', [
            'eleve_id'     => $this->eleve->id,
            'scolarite_id' => $this->scolarite->id,
            'montant'      => 80000,
            'return_url'   => 'https://ecole.test/PaiementRetour',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['payment_url', 'transaction_id']);

        $this->assertDatabaseHas('paiements', [
            'eleve_id'        => $this->eleve->id,
            'scolarite_id'    => $this->scolarite->id,
            'montant_paye'    => 80000,
            'mode_paiement'   => 'cinetpay',
            'statut_cinetpay' => 'pending',
            'payment_url'     => 'https://checkout.cinetpay.com/abc123',
        ]);
    }

    /** @test */
    public function initier_supprime_le_paiement_pending_si_cinetpay_refuse(): void
    {
        Http::fake([
            '*/payment' => Http::response([
                'code'    => '600',
                'message' => 'INVALID_CREDENTIALS',
            ]),
        ]);

        $response = $this->postJson('/api/paiements/initier', [
            'eleve_id'     => $this->eleve->id,
            'scolarite_id' => $this->scolarite->id,
            'montant'      => 80000,
            'return_url'   => 'https://ecole.test/PaiementRetour',
        ]);

        $response->assertStatus(502);
        $this->assertDatabaseMissing('paiements', ['eleve_id' => $this->eleve->id]);
    }

    /** @test */
    public function notify_marque_le_paiement_paid_quand_cinetpay_confirme_laccept(): void
    {
        $paiement = Paiement::create([
            'eleve_id'        => $this->eleve->id,
            'scolarite_id'    => $this->scolarite->id,
            'montant_paye'    => 80000,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'cinetpay',
            'transaction_id'  => 'SCOL-NOTIFY-1',
            'statut_cinetpay' => 'pending',
        ]);

        Http::fake([
            '*/payment/check' => Http::response([
                'code' => '00',
                'data' => ['status' => 'ACCEPTED'],
            ]),
        ]);

        $response = $this->postJson('/api/paiements/notify', [
            'cpm_trans_id' => 'SCOL-NOTIFY-1',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('paid', $paiement->fresh()->statut_cinetpay);
    }

    /** @test */
    public function notify_marque_le_paiement_failed_quand_cinetpay_refuse(): void
    {
        $paiement = Paiement::create([
            'eleve_id'        => $this->eleve->id,
            'scolarite_id'    => $this->scolarite->id,
            'montant_paye'    => 80000,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'cinetpay',
            'transaction_id'  => 'SCOL-NOTIFY-2',
            'statut_cinetpay' => 'pending',
        ]);

        Http::fake([
            '*/payment/check' => Http::response([
                'code' => '00',
                'data' => ['status' => 'REFUSED'],
            ]),
        ]);

        $this->postJson('/api/paiements/notify', ['cpm_trans_id' => 'SCOL-NOTIFY-2'])
             ->assertStatus(200);

        $this->assertEquals('failed', $paiement->fresh()->statut_cinetpay);
    }

    /** @test */
    public function notify_ignore_silencieusement_une_transaction_inconnue(): void
    {
        Http::fake();

        $this->postJson('/api/paiements/notify', ['cpm_trans_id' => 'INCONNU'])
             ->assertStatus(200);

        Http::assertNothingSent();
    }

    /** @test */
    public function statut_interroge_cinetpay_tant_que_le_paiement_est_pending(): void
    {
        $paiement = Paiement::create([
            'eleve_id'        => $this->eleve->id,
            'scolarite_id'    => $this->scolarite->id,
            'montant_paye'    => 80000,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'cinetpay',
            'transaction_id'  => 'SCOL-STATUT-1',
            'statut_cinetpay' => 'pending',
        ]);

        Http::fake([
            '*/payment/check' => Http::response([
                'code' => '00',
                'data' => ['status' => 'ACCEPTED'],
            ]),
        ]);

        $response = $this->getJson('/api/paiements/statut/SCOL-STATUT-1');

        $response->assertStatus(200)
                 ->assertJsonPath('statut_cinetpay', 'paid');
        $this->assertEquals('paid', $paiement->fresh()->statut_cinetpay);
    }

    /** @test */
    public function statut_ne_reinterroge_pas_cinetpay_si_deja_confirme(): void
    {
        Paiement::create([
            'eleve_id'        => $this->eleve->id,
            'scolarite_id'    => $this->scolarite->id,
            'montant_paye'    => 80000,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'cinetpay',
            'transaction_id'  => 'SCOL-STATUT-2',
            'statut_cinetpay' => 'paid',
        ]);

        Http::fake();

        $this->getJson('/api/paiements/statut/SCOL-STATUT-2')
             ->assertStatus(200)
             ->assertJsonPath('statut_cinetpay', 'paid');

        Http::assertNothingSent();
    }
}
