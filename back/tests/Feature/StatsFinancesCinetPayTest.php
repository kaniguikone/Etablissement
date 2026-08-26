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

/**
 * Verrouille le fix du bug de comptabilisation (paiements CinetPay pending/failed
 * comptés comme reçus) dans les endroits qui alimentent les tableaux de bord et
 * statistiques — distincts de PaiementController déjà couvert par PaiementTest.
 */
class StatsFinancesCinetPayTest extends TestCase
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

        Paiement::create([
            'eleve_id'        => $this->eleve->id,
            'scolarite_id'    => $this->scolarite->id,
            'montant_paye'    => 80000,
            'date_paiement'   => now()->toDateString(),
            'mode_paiement'   => 'cinetpay',
            'transaction_id'  => 'SCOL-STATS-PENDING',
            'statut_cinetpay' => 'pending',
        ]);
    }

    /** @test */
    public function dashboard_stats_ignore_un_paiement_cinetpay_en_attente(): void
    {
        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
                 ->assertJsonPath('total_encaisse', 0)
                 ->assertJsonPath('eleves_en_retard', 1)
                 ->assertJsonPath('eleves_a_jour', 0)
                 ->assertJsonCount(0, 'derniers_paiements');
    }

    /** @test */
    public function stats_synthese_ignore_un_paiement_cinetpay_en_attente(): void
    {
        $response = $this->getJson('/api/stats/synthese');

        $response->assertStatus(200)
                 ->assertJsonPath('total_encaisse_global', 0);
    }

    /** @test */
    public function stats_finances_ignore_un_paiement_cinetpay_en_attente(): void
    {
        $response = $this->getJson('/api/stats/finances');

        $response->assertStatus(200);
        $parNiveau = collect($response->json('par_niveau'))->firstWhere('nb_eleves', '>', 0);
        $this->assertNotNull($parNiveau);
        $this->assertEquals(0, $parNiveau['total_encaisse']);
        $this->assertEquals(0, $parNiveau['eleves_a_jour']);
        $this->assertEquals(1, $parNiveau['eleves_en_retard']);
    }
}
