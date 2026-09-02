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
use App\Services\Edt\Generateur;
use App\Services\Edt\Validateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Chantier EDT — Lot 2 : générateur d'emploi du temps + scénarios.
 */
class EdtGenerationTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
        $this->seed(\Database\Seeders\EdtContrainteSeeder::class);

        // Grille : 6 plages de cours identiques du lundi au vendredi
        foreach ([['08:00', '09:00'], ['09:00', '10:00'], ['10:15', '11:15'], ['11:15', '12:15'], ['14:00', '15:00'], ['15:00', '16:00']] as $i => [$d, $f]) {
            PlageHoraire::create(['libelle' => 'P'.($i + 1), 'jour' => null, 'ordre' => $i + 1, 'heure_debut' => $d, 'heure_fin' => $f, 'type' => 'cours']);
        }

        $niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e', 'ordre' => 1]);

        // 4 matières, 3 h/semaine chacune → 12 h par classe, largement plaçable
        $matieres = [];
        foreach ([['MATHS', 'maths'], ['FR', 'francais'], ['HG', 'hist_geo'], ['ANG', 'anglais']] as [$abbr, $fam]) {
            $m = Matiere::create(['abbr_matiere' => $abbr, 'libelle_matiere' => $abbr, 'description_matiere' => 'x', 'famille' => $fam, 'effort_soutenu' => true]);
            $matieres[$abbr] = $m;
            VolumeHoraire::create(['niveau_id' => $niveau->id, 'matiere_id' => $m->id, 'heures_semaine' => 3, 'semaines_annee' => 36]);
            $nm = NiveauMatiere::create(['niveau_id' => $niveau->id, 'matiere_id' => $m->id, 'obligatoire' => true, 'coefficient' => 2]);
            SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 3]);
        }

        // 2 classes, 8 profs (2 par matière), affectations
        foreach (['A', 'B'] as $x) {
            $classe = Classe::create(['num_classe' => $x, 'nom_classe' => "6ème {$x}", 'abbr_classe' => "6{$x}", 'niveau_id' => $niveau->id, 'effectif_max_classe' => 30]);
            foreach ($matieres as $abbr => $m) {
                $prof = Enseignant::create(['matricule_enseignant' => "E{$x}{$abbr}", 'nom_enseignant' => "PROF{$abbr}", 'prenoms_enseignant' => $x]);
                \Illuminate\Support\Facades\DB::table('classe_enseignant_matiere')->insert([
                    'classe_id' => $classe->id, 'enseignant_id' => $prof->id, 'matiere_id' => $m->id,
                ]);
            }
        }
    }

    /** @test */
    public function le_generateur_produit_un_edt_sans_conflit(): void
    {
        $resultat = (new Generateur)->generer(['jours' => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']]);

        // 2 classes × 4 matières × 3 séances = 24 créneaux
        $this->assertCount(24, $resultat['creneaux']);
        $this->assertEmpty($resultat['diagnostic']['non_placees']);

        // Aucun conflit dur en revérifiant via le Validateur (on insère puis on relit)
        foreach ($resultat['creneaux'] as $c) {
            EmploiDuTemps::withoutGlobalScope('officiel')->create($c + ['generation_id' => 999]);
        }
        $creneaux = EmploiDuTemps::withoutGlobalScope('officiel')
            ->with(['classe.niveau', 'matiere', 'enseignant', 'salle'])->where('generation_id', 999)->get();

        $this->assertSame(0, (new Validateur)->analyser($creneaux)['nb_dures']);
    }

    /** @test */
    public function endpoint_generation_cree_un_scenario_invisible_de_ledt_officiel(): void
    {
        $r = $this->postJson('/api/edt/generations', ['libelle' => 'Test'])->assertStatus(201);

        $generationId = $r->json('generation.id');
        $this->assertSame('termine', $r->json('generation.statut'));
        $this->assertIsInt($r->json('generation.score'));
        $this->assertNotEmpty($r->json('par_classe'));

        // L'EDT officiel (scope par défaut) reste vide
        $this->assertSame(0, EmploiDuTemps::count());
        // Les créneaux existent bien, rattachés au scénario
        $this->assertGreaterThan(0, EmploiDuTemps::withoutGlobalScope('officiel')->where('generation_id', $generationId)->count());
    }

    /** @test */
    public function publier_un_scenario_le_promeut_en_edt_officiel(): void
    {
        $r = $this->postJson('/api/edt/generations', [])->assertStatus(201);
        $id = $r->json('generation.id');

        $this->postJson("/api/edt/generations/{$id}/publier")->assertStatus(200);

        // Les créneaux sont maintenant officiels (visibles sans lever le scope)
        $this->assertGreaterThan(0, EmploiDuTemps::count());
        $this->assertSame('publie', \App\Models\EdtGeneration::find($id)->statut);
    }

    /** @test */
    public function un_scenario_publie_ne_peut_pas_etre_supprime(): void
    {
        $id = $this->postJson('/api/edt/generations', [])->json('generation.id');
        $this->postJson("/api/edt/generations/{$id}/publier")->assertStatus(200);

        $this->deleteJson("/api/edt/generations/{$id}")->assertStatus(422);
    }

    /** @test */
    public function suppression_scenario_non_publie(): void
    {
        $id = $this->postJson('/api/edt/generations', [])->json('generation.id');

        $this->deleteJson("/api/edt/generations/{$id}")->assertStatus(204);
        $this->assertSame(0, EmploiDuTemps::withoutGlobalScope('officiel')->where('generation_id', $id)->count());
    }

    /** @test */
    public function matiere_sans_enseignant_est_signalee(): void
    {
        $niveau = Niveau::first();
        $orphdine = Matiere::create(['abbr_matiere' => 'PHILO', 'libelle_matiere' => 'Philo', 'description_matiere' => 'x', 'famille' => 'philo']);
        $nm = NiveauMatiere::create(['niveau_id' => $niveau->id, 'matiere_id' => $orphdine->id, 'obligatoire' => true, 'coefficient' => 1]);
        SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 2]);

        $resultat = (new Generateur)->generer([]);

        $this->assertNotEmpty($resultat['diagnostic']['non_affectees']);
    }
}
