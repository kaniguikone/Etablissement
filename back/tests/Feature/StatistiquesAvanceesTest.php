<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\Devoir;
use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\Note;
use App\Models\Periodes;
use App\Models\TypeDevoir;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class StatistiquesAvanceesTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    private Niveau $niveau;
    private Classe $classe;
    private Periodes $periode;
    private Matiere $matiere;
    private Enseignant $enseignant;
    private TypeDevoir $typeDevoir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();

        $this->niveau = $this->creerNiveau('CE2', 'CE2');
        $this->classe = $this->creerClasse($this->niveau->id, 'CE2 A', 'CE2A');

        $this->periode = Periodes::create([
            'libelle_periode'      => 'Période 1',
            'abbr_libelle_periode' => 'P1',
            'annee'                => '2025-2026',
            'date_debut'           => '2025-10-01',
            'date_fin'             => '2025-12-20',
        ]);

        $this->matiere = Matiere::create([
            'libelle_matiere'     => 'Mathématiques',
            'abbr_matiere'        => 'Maths',
            'description_matiere' => 'Test',
            'coeff_matiere'       => 4,
        ]);

        $this->enseignant = Enseignant::create([
            'matricule_enseignant' => 'ENS200',
            'nom_enseignant'       => 'DIALLO',
            'prenoms_enseignant'   => 'Oumar',
        ]);

        $this->typeDevoir = TypeDevoir::create([
            'libelle_type_devoir'      => 'Interrogation',
            'abbr_type_devoir'         => 'Interro',
            'code_type_devoir'         => 'INT',
            'description_type_devoir'  => 'Interrogation test',
        ]);
    }

    private function creerEleveTest(string $matricule, string $nom): Eleve
    {
        return $this->creerEleve($this->classe->id, $matricule, $nom, 'Test');
    }

    private function creerDevoir(): Devoir
    {
        // Lier l'enseignant à la classe + matière pour les stats enseignants
        DB::table('classe_enseignant_matiere')->insertOrIgnore([
            'classe_id'     => $this->classe->id,
            'enseignant_id' => $this->enseignant->id,
            'matiere_id'    => $this->matiere->id,
        ]);

        return Devoir::create([
            'code_devoir'    => 'DEV001',
            'classe_id'      => $this->classe->id,
            'matiere_id'     => $this->matiere->id,
            'periode_id'     => $this->periode->id,
            'type_devoir_id' => $this->typeDevoir->id,
            'date_devoir'    => '2025-11-15',
            'coeff_devoir'   => 1,
        ]);
    }

    /** @test */
    public function evolution_retourne_tableau_vide_sans_notes(): void
    {
        $response = $this->getJson("/api/stats/evolution?classe_id={$this->classe->id}");

        $response->assertStatus(200)
                 ->assertJsonIsArray()
                 ->assertExactJson([]);
    }

    /** @test */
    public function evolution_retourne_moyenne_par_periode(): void
    {
        $eleve1 = $this->creerEleveTest('E01', 'KONÉ');
        $eleve2 = $this->creerEleveTest('E02', 'TRAORÉ');
        $devoir = $this->creerDevoir();

        Note::create(['eleve_id' => $eleve1->id, 'devoir_id' => $devoir->id, 'note' => 15]);
        Note::create(['eleve_id' => $eleve2->id, 'devoir_id' => $devoir->id, 'note' => 12]);

        $response = $this->getJson("/api/stats/evolution?classe_id={$this->classe->id}");

        $response->assertStatus(200)->assertJsonIsArray();

        $data = $response->json();
        $this->assertNotEmpty($data);
        $this->assertArrayHasKey('periode', $data[0]);
        $this->assertArrayHasKey('moyenne_gen', $data[0]);
    }

    /** @test */
    public function classement_valide_avec_notes(): void
    {
        $eleve1 = $this->creerEleveTest('E10', 'PREMIER');
        $eleve2 = $this->creerEleveTest('E11', 'DEUXIEME');
        $devoir = $this->creerDevoir();

        Note::create(['eleve_id' => $eleve1->id, 'devoir_id' => $devoir->id, 'note' => 18]);
        Note::create(['eleve_id' => $eleve2->id, 'devoir_id' => $devoir->id, 'note' => 12]);

        $response = $this->getJson(
            "/api/stats/classement?classe_id={$this->classe->id}&periode_id={$this->periode->id}"
        );

        $response->assertStatus(200)
                 ->assertJsonStructure(['classe', 'periode', 'classement']);

        $classement = $response->json('classement');
        $this->assertCount(2, $classement);
        $this->assertEquals(1, $classement[0]['rang']);
        $this->assertStringContainsString('PREMIER', $classement[0]['nom']);
        $this->assertEquals(2, $classement[1]['rang']);
    }

    /** @test */
    public function classement_requiert_classe_id_et_periode_id(): void
    {
        $response = $this->getJson('/api/stats/classement');

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['classe_id', 'periode_id']);
    }

    /** @test */
    public function classement_mention_assignee_correctement(): void
    {
        $eleve  = $this->creerEleveTest('E20', 'EXCELLENT');
        $devoir = $this->creerDevoir();
        Note::create(['eleve_id' => $eleve->id, 'devoir_id' => $devoir->id, 'note' => 19]);

        $response = $this->getJson(
            "/api/stats/classement?classe_id={$this->classe->id}&periode_id={$this->periode->id}"
        );

        $response->assertStatus(200);
        $classement = $response->json('classement');
        $this->assertNotEmpty($classement);
        $this->assertEquals('Très bien', $classement[0]['mention']);
    }

    /** @test */
    public function stats_enseignants_retourne_activite(): void
    {
        $eleve1 = $this->creerEleveTest('E30', 'KONÉ');
        $devoir = $this->creerDevoir();
        Note::create(['eleve_id' => $eleve1->id, 'devoir_id' => $devoir->id, 'note' => 14]);

        $response = $this->getJson("/api/stats/enseignants?periode_id={$this->periode->id}");

        $response->assertStatus(200)->assertJsonIsArray();

        $data = $response->json();
        $this->assertNotEmpty($data);
        $ens = $data[0];
        $this->assertArrayHasKey('nb_devoirs', $ens);
        $this->assertArrayHasKey('nb_notes_saisies', $ens);
        $this->assertArrayHasKey('nb_eleves_evalues', $ens);
        $this->assertArrayHasKey('moyenne_classe', $ens);
        $this->assertEquals(1, $ens['nb_devoirs']);
        $this->assertEquals(1, $ens['nb_notes_saisies']);
    }

    /** @test */
    public function stats_enseignants_sans_notes_retourne_tableau_vide(): void
    {
        // Enseignant sans affectation → n'apparaît pas
        $response = $this->getJson('/api/stats/enseignants');

        $response->assertStatus(200)
                 ->assertJsonIsArray()
                 ->assertExactJson([]);
    }
}
