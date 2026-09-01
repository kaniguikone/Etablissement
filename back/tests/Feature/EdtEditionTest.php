<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\EmploiDuTemps;
use App\Models\Enseignant;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\NiveauMatiere;
use App\Models\PlageHoraire;
use App\Models\SeanceType;
use App\Models\VolumeHoraire;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Chantier EDT — Lot 3 : édition assistée d'un scénario + exports PDF.
 */
class EdtEditionTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    private Niveau $niveau;

    private Classe $classe;

    private Matiere $maths;

    private Enseignant $prof;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
        $this->seed(\Database\Seeders\EdtContrainteSeeder::class);

        foreach ([['08:00', '09:00'], ['09:00', '10:00'], ['10:15', '11:15'], ['11:15', '12:15']] as $i => [$d, $f]) {
            PlageHoraire::create(['libelle' => 'P'.($i + 1), 'jour' => null, 'ordre' => $i + 1, 'heure_debut' => $d, 'heure_fin' => $f, 'type' => 'cours']);
        }

        $this->niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e', 'ordre' => 1]);
        $this->classe = Classe::create(['num_classe' => '1', 'nom_classe' => '6ème A', 'abbr_classe' => '6A', 'niveau_id' => $this->niveau->id, 'effectif_max_classe' => 30]);
        $this->maths = Matiere::create(['abbr_matiere' => 'MATHS', 'libelle_matiere' => 'Mathématiques', 'description_matiere' => 'x', 'famille' => 'maths']);
        $fr = Matiere::create(['abbr_matiere' => 'FR', 'libelle_matiere' => 'Français', 'description_matiere' => 'x', 'famille' => 'francais']);

        foreach ([$this->maths, $fr] as $m) {
            VolumeHoraire::create(['niveau_id' => $this->niveau->id, 'matiere_id' => $m->id, 'heures_semaine' => 2, 'semaines_annee' => 36]);
            $nm = NiveauMatiere::create(['niveau_id' => $this->niveau->id, 'matiere_id' => $m->id, 'obligatoire' => true, 'coefficient' => 2]);
            SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 2]);
        }
        $this->prof = Enseignant::create(['matricule_enseignant' => 'E1', 'nom_enseignant' => 'DIALLO', 'prenoms_enseignant' => 'O']);
        foreach ([$this->maths, $fr] as $m) {
            \Illuminate\Support\Facades\DB::table('classe_enseignant_matiere')->insert(['classe_id' => $this->classe->id, 'enseignant_id' => $this->prof->id, 'matiere_id' => $m->id]);
        }
    }

    private function genererScenario(): int
    {
        return $this->postJson('/api/edt/generations', ['libelle' => 'Base'])->json('generation.id');
    }

    /** @test */
    public function verrouiller_puis_regenerer_conserve_les_creneaux_verrouilles(): void
    {
        $id = $this->genererScenario();

        // Verrouille tous les créneaux de Maths du scénario
        $mathsCreneaux = EmploiDuTemps::withoutGlobalScope('officiel')
            ->where('generation_id', $id)->where('matiere_id', $this->maths->id)->get();
        foreach ($mathsCreneaux as $c) {
            $this->patchJson("/api/edt/generations/{$id}/creneaux/{$c->id}", ['verrouille' => true])->assertStatus(200);
        }
        $positionsVerrouillees = $mathsCreneaux->fresh()->map(fn ($c) => $c->jour.$c->heure_debut)->sort()->values();

        $r = $this->postJson("/api/edt/generations/{$id}/regenerer")->assertStatus(201);
        $nouveauId = $r->json('generation.id');

        $mathsRegen = EmploiDuTemps::withoutGlobalScope('officiel')
            ->where('generation_id', $nouveauId)->where('matiere_id', $this->maths->id)->where('verrouille', true)->get();

        $this->assertCount(2, $mathsRegen);
        $this->assertEquals(
            $positionsVerrouillees->all(),
            $mathsRegen->map(fn ($c) => $c->jour.$c->heure_debut)->sort()->values()->all()
        );
    }

    /** @test */
    public function deplacer_un_creneau_derive_les_heures_de_la_plage(): void
    {
        $id = $this->genererScenario();
        $creneau = EmploiDuTemps::withoutGlobalScope('officiel')->where('generation_id', $id)->first();
        $autrePlage = PlageHoraire::where('heure_debut', '11:15')->first();

        $this->patchJson("/api/edt/generations/{$id}/creneaux/{$creneau->id}", [
            'jour' => 'vendredi', 'plage_horaire_id' => $autrePlage->id,
        ])->assertStatus(200);

        $creneau->refresh();
        $this->assertSame('vendredi', $creneau->jour);
        $this->assertSame('11:15', substr($creneau->heure_debut, 0, 5));
        $this->assertSame('12:15', substr($creneau->heure_fin, 0, 5));
    }

    /** @test */
    public function deplacement_creant_un_conflit_est_signale(): void
    {
        $id = $this->genererScenario();
        $creneaux = EmploiDuTemps::withoutGlobalScope('officiel')->where('generation_id', $id)->orderBy('id')->get();
        $a = $creneaux[0];
        $b = $creneaux[1];

        // Place b exactement sur a (même classe + prof + horaire) → conflit
        $r = $this->patchJson("/api/edt/generations/{$id}/creneaux/{$b->id}", [
            'jour' => $a->jour, 'plage_horaire_id' => $a->plage_horaire_id,
        ])->assertStatus(200);

        $this->assertArrayHasKey('conflits', $r->json());
        $this->assertNotEmpty($r->json('conflits'));
    }

    /** @test */
    public function supprimer_un_creneau_de_scenario(): void
    {
        $id = $this->genererScenario();
        $creneau = EmploiDuTemps::withoutGlobalScope('officiel')->where('generation_id', $id)->first();

        $this->deleteJson("/api/edt/generations/{$id}/creneaux/{$creneau->id}")->assertStatus(204);
        $this->assertNull(EmploiDuTemps::withoutGlobalScope('officiel')->find($creneau->id));
    }

    /** @test */
    public function export_pdf_classe_du_scenario(): void
    {
        $id = $this->genererScenario();

        $r = $this->get("/api/edt/{$id}/pdf/classe/{$this->classe->id}");
        $r->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $r->headers->get('content-type'));
    }

    /** @test */
    public function export_pdf_officiel_toutes_classes(): void
    {
        $id = $this->genererScenario();
        $this->postJson("/api/edt/generations/{$id}/publier")->assertStatus(200);

        $this->get('/api/edt/officiel/pdf/classes')
            ->assertStatus(200)
            ->assertHeader('content-type', 'application/pdf');
    }

    /** @test */
    public function publier_notifie_les_enseignants(): void
    {
        $id = $this->genererScenario();
        $this->postJson("/api/edt/generations/{$id}/publier")->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'owner_type' => 'enseignant', 'owner_id' => $this->prof->id, 'type' => 'edt_publie',
        ]);
    }
}
