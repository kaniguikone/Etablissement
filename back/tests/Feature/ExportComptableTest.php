<?php

namespace Tests\Feature;

use App\Models\FraisAnnexe;
use App\Models\Niveau;
use App\Models\Paiement;
use App\Models\PaiementFraisAnnexe;
use App\Models\Scolarites;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class ExportComptableTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    // ── Aperçu (résumé JSON) ──────────────────────────────────────────────────

    /** @test */
    public function apercu_retourne_structure_correcte_sans_donnees(): void
    {
        $response = $this->getJson('/api/export-comptable/apercu');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'total_encaisse',
                     'total_scolarite',
                     'total_frais_annexes',
                     'nombre_ecritures',
                     'par_mode',
                 ]);

        $this->assertEquals(0.0, $response->json('total_encaisse'));
        $this->assertEquals(0,   $response->json('nombre_ecritures'));
    }

    /** @test */
    public function apercu_totalise_paiements_scolarite(): void
    {
        $niveau    = $this->creerNiveau('6ème', '6e');
        $classe    = $this->creerClasse($niveau->id, '6ème A', '6A');
        $eleve     = $this->creerEleve($classe->id, 'ELV001', 'KONE', 'Mamadou');
        $scolarite = Scolarites::create([
            'libelle_echeance' => '1ère tranche',
            'date_echeance'    => '2025-10-31',
            'montant_echeance' => '80000',
            'niveau_id'        => $niveau->id,
        ]);

        Paiement::create([
            'eleve_id'      => $eleve->id,
            'scolarite_id'  => $scolarite->id,
            'montant_paye'  => 80000,
            'date_paiement' => '2025-10-15',
            'mode_paiement' => 'especes',
        ]);

        $response = $this->getJson('/api/export-comptable/apercu');

        $response->assertStatus(200);
        $this->assertEquals(80000.0, $response->json('total_scolarite'));
        $this->assertEquals(80000.0, $response->json('total_encaisse'));
        $this->assertEquals(1, $response->json('nombre_ecritures'));
    }

    /** @test */
    public function apercu_totalise_paiements_frais_annexes(): void
    {
        $niveau = $this->creerNiveau('5ème', '5e');
        $classe = $this->creerClasse($niveau->id, '5ème A', '5A');
        $eleve  = $this->creerEleve($classe->id, 'ELV002', 'DIALLO', 'Seydou');

        $frais = FraisAnnexe::create([
            'nom'       => 'Tenue',
            'categorie' => 'tenue',
            'montant'   => 25000,
            'annee'     => '2025-2026',
        ]);

        PaiementFraisAnnexe::create([
            'eleve_id'        => $eleve->id,
            'frais_annexe_id' => $frais->id,
            'montant_paye'    => 25000,
            'date_paiement'   => '2025-10-20',
            'mode_paiement'   => 'cheque',
        ]);

        $response = $this->getJson('/api/export-comptable/apercu');

        $response->assertStatus(200);
        $this->assertEquals(25000.0, $response->json('total_frais_annexes'));
        $this->assertEquals(25000.0, $response->json('total_encaisse'));
    }

    /** @test */
    public function apercu_cumule_scolarite_et_frais_annexes(): void
    {
        $niveau    = $this->creerNiveau('4ème', '4e');
        $classe    = $this->creerClasse($niveau->id, '4ème A', '4A');
        $eleve     = $this->creerEleve($classe->id, 'ELV003', 'COULIBALY', 'Mariam');
        $scolarite = Scolarites::create([
            'libelle_echeance' => 'Tranche 1',
            'date_echeance'    => '2025-10-31',
            'montant_echeance' => '70000',
            'niveau_id'        => $niveau->id,
        ]);

        Paiement::create([
            'eleve_id'      => $eleve->id,
            'scolarite_id'  => $scolarite->id,
            'montant_paye'  => 70000,
            'date_paiement' => '2025-10-05',
            'mode_paiement' => 'virement',
        ]);

        $frais = FraisAnnexe::create([
            'nom'       => 'Examen',
            'categorie' => 'examen',
            'montant'   => 10000,
            'annee'     => '2025-2026',
        ]);

        PaiementFraisAnnexe::create([
            'eleve_id'        => $eleve->id,
            'frais_annexe_id' => $frais->id,
            'montant_paye'    => 10000,
            'date_paiement'   => '2025-11-01',
            'mode_paiement'   => 'especes',
        ]);

        $response = $this->getJson('/api/export-comptable/apercu');

        $response->assertStatus(200);
        $this->assertEquals(80000.0, $response->json('total_encaisse'));
        $this->assertEquals(70000.0, $response->json('total_scolarite'));
        $this->assertEquals(10000.0, $response->json('total_frais_annexes'));
        $this->assertEquals(2, $response->json('nombre_ecritures'));
    }

    /** @test */
    public function apercu_filtre_par_date_debut(): void
    {
        $niveau    = $this->creerNiveau('3ème', '3e');
        $classe    = $this->creerClasse($niveau->id, '3ème A', '3A');
        $eleve     = $this->creerEleve($classe->id, 'ELV004', 'TRAORE', 'Adama');
        $scolarite = Scolarites::create([
            'libelle_echeance' => 'Tranche 1',
            'date_echeance'    => '2025-10-31',
            'montant_echeance' => '60000',
            'niveau_id'        => $niveau->id,
        ]);

        // Paiement en septembre — doit être exclu
        Paiement::create([
            'eleve_id'      => $eleve->id,
            'scolarite_id'  => $scolarite->id,
            'montant_paye'  => 60000,
            'date_paiement' => '2025-09-10',
            'mode_paiement' => 'especes',
        ]);

        $response = $this->getJson('/api/export-comptable/apercu?date_debut=2025-10-01');

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('nombre_ecritures'));
        $this->assertEquals(0.0, $response->json('total_encaisse'));
    }

    /** @test */
    public function apercu_par_mode_paiement(): void
    {
        $niveau    = $this->creerNiveau('CM2', 'CM2');
        $classe    = $this->creerClasse($niveau->id, 'CM2 A', 'CM2A');
        $eleve     = $this->creerEleve($classe->id, 'ELV005', 'BAMBA', 'Lacina');
        $scolarite = Scolarites::create([
            'libelle_echeance' => 'Tranche 1',
            'date_echeance'    => '2025-10-31',
            'montant_echeance' => '50000',
            'niveau_id'        => $niveau->id,
        ]);

        Paiement::create([
            'eleve_id'      => $eleve->id,
            'scolarite_id'  => $scolarite->id,
            'montant_paye'  => 50000,
            'date_paiement' => '2025-10-10',
            'mode_paiement' => 'cheque',
        ]);

        $response = $this->getJson('/api/export-comptable/apercu');

        $response->assertStatus(200);
        $parMode = $response->json('par_mode');
        $this->assertArrayHasKey('cheque', $parMode);
        $this->assertEquals(50000.0, $parMode['cheque']);
    }

    /** @test */
    public function apercu_validation_date_invalide(): void
    {
        $response = $this->getJson('/api/export-comptable/apercu?date_debut=pas-une-date');

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['date_debut']);
    }

    // ── Export Excel ──────────────────────────────────────────────────────────

    /** @test */
    public function export_excel_retourne_fichier_xlsx(): void
    {
        $response = $this->getJson('/api/export-comptable?format=excel');

        $response->assertStatus(200)
                 ->assertHeader(
                     'Content-Type',
                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                 );
    }

    // ── Export FEC / CSV ─────────────────────────────────────────────────────

    /** @test */
    public function export_fec_retourne_fichier_csv(): void
    {
        $response = $this->getJson('/api/export-comptable?format=fec');

        $response->assertStatus(200)
                 ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    /** @test */
    public function export_format_invalide_retourne_erreur(): void
    {
        $response = $this->getJson('/api/export-comptable?format=pdf');

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['format']);
    }
}
