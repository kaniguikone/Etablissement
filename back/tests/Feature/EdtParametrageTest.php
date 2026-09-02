<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\Enseignant;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\NiveauMatiere;
use App\Models\PlageHoraire;
use App\Models\Salle;
use App\Models\VolumeHoraire;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Chantier EDT — Lot 0 : grille horaire, séances-types, indisponibilités,
 * salle attitrée et diagnostic de complétude.
 */
class EdtParametrageTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    // ── 0.2 Grille horaire ──────────────────────────────────────────────────

    /** @test */
    public function crud_plage_horaire(): void
    {
        $r = $this->postJson('/api/plages-horaires', [
            'libelle' => 'M1', 'jour' => 'lundi', 'ordre' => 1,
            'heure_debut' => '07:30', 'heure_fin' => '08:25', 'type' => 'cours',
        ])->assertStatus(201);

        $id = $r->json('id');
        $this->putJson("/api/plages-horaires/{$id}", [
            'libelle' => 'M1', 'jour' => 'lundi', 'ordre' => 1,
            'heure_debut' => '07:30', 'heure_fin' => '08:30',
        ])->assertStatus(200);

        $this->deleteJson("/api/plages-horaires/{$id}")->assertStatus(204);
    }

    /** @test */
    public function rejet_chevauchement_plages_meme_jour(): void
    {
        PlageHoraire::create(['libelle' => 'M1', 'jour' => 'lundi', 'heure_debut' => '08:00', 'heure_fin' => '09:00', 'type' => 'cours']);

        $this->postJson('/api/plages-horaires', [
            'libelle' => 'M2', 'jour' => 'lundi', 'heure_debut' => '08:30', 'heure_fin' => '09:30',
        ])->assertStatus(422);
    }

    /** @test */
    public function rejet_suppression_plage_referencee(): void
    {
        $niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e']);
        $classe = Classe::create(['num_classe' => '1', 'nom_classe' => '6e A', 'abbr_classe' => '6A', 'niveau_id' => $niveau->id]);
        $matiere = Matiere::create(['abbr_matiere' => 'M', 'libelle_matiere' => 'Maths', 'description_matiere' => 'x']);
        $ens = Enseignant::create(['matricule_enseignant' => 'E1', 'nom_enseignant' => 'X', 'prenoms_enseignant' => 'Y']);
        $plage = PlageHoraire::create(['libelle' => 'M1', 'jour' => 'lundi', 'heure_debut' => '08:00', 'heure_fin' => '10:00', 'type' => 'cours']);

        \App\Models\EmploiDuTemps::create([
            'classe_id' => $classe->id, 'matiere_id' => $matiere->id, 'enseignant_id' => $ens->id,
            'plage_horaire_id' => $plage->id, 'jour' => 'lundi', 'heure_debut' => '08:00', 'heure_fin' => '10:00',
        ]);

        $this->deleteJson("/api/plages-horaires/{$plage->id}")->assertStatus(422);
    }

    /** @test */
    public function dupliquer_jour_recopie_les_plages(): void
    {
        PlageHoraire::create(['libelle' => 'M1', 'jour' => 'lundi', 'heure_debut' => '08:00', 'heure_fin' => '09:00', 'type' => 'cours']);
        PlageHoraire::create(['libelle' => 'M2', 'jour' => 'lundi', 'heure_debut' => '09:00', 'heure_fin' => '10:00', 'type' => 'cours']);

        $this->postJson('/api/plages-horaires/dupliquer-jour', [
            'source' => 'lundi', 'cibles' => ['mardi', 'jeudi'],
        ])->assertStatus(200)->assertJsonPath('creees', 4);

        $this->assertEquals(2, PlageHoraire::where('jour', 'mardi')->count());
    }

    // ── 0.4 Séances-types ───────────────────────────────────────────────────

    private function niveauMatiereAvecVolume(float $heures = 4): NiveauMatiere
    {
        $niveau = Niveau::create(['nom_niveau' => '3ème', 'abbr_niveau' => '3e']);
        $matiere = Matiere::create(['abbr_matiere' => 'MATHS', 'libelle_matiere' => 'Maths', 'description_matiere' => 'x']);
        VolumeHoraire::create(['niveau_id' => $niveau->id, 'matiere_id' => $matiere->id, 'heures_semaine' => $heures, 'semaines_annee' => 36]);

        return NiveauMatiere::create([
            'niveau_id' => $niveau->id, 'serie_id' => null, 'matiere_id' => $matiere->id,
            'obligatoire' => true, 'coefficient' => 4,
        ]);
    }

    /** @test */
    public function crud_seance_type_et_calcul_ecart(): void
    {
        $nm = $this->niveauMatiereAvecVolume(4);

        $this->postJson('/api/seances-types', [
            'niveau_matiere_id' => $nm->id, 'duree_minutes' => 110, 'nb_seances' => 1,
        ])->assertStatus(201);
        $this->postJson('/api/seances-types', [
            'niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 2,
        ])->assertStatus(201);

        $resp = $this->getJson("/api/seances-types/{$nm->niveau_id}")->assertStatus(200);
        $matiere = collect($resp->json('matieres'))->firstWhere('niveau_matiere_id', $nm->id);

        $this->assertEqualsWithDelta(4.0, $matiere['heures_prevues'], 0.01);
        // 110min + 2*55min = 220min = 3.67h
        $this->assertEqualsWithDelta(3.67, $matiere['heures_seances'], 0.02);
    }

    /** @test */
    public function generer_seances_depuis_volume(): void
    {
        $nm = $this->niveauMatiereAvecVolume(4);

        $this->postJson("/api/seances-types/generer/{$nm->niveau_id}")
            ->assertStatus(200)
            ->assertJsonPath('crees', 1);

        $this->assertDatabaseHas('seances_types', ['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 4]);
    }

    /** @test */
    public function suppression_niveau_matiere_cascade_les_seances(): void
    {
        $nm = $this->niveauMatiereAvecVolume();
        $this->postJson('/api/seances-types', ['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 1])->assertStatus(201);

        $nm->delete();

        $this->assertDatabaseCount('seances_types', 0);
    }

    // ── 0.5 Indisponibilités ────────────────────────────────────────────────

    /** @test */
    public function crud_indisponibilite(): void
    {
        $ens = Enseignant::create(['matricule_enseignant' => 'E1', 'nom_enseignant' => 'DIALLO', 'prenoms_enseignant' => 'O']);

        $r = $this->postJson("/api/enseignants/{$ens->id}/indisponibilites", [
            'jour' => 'mercredi', 'heure_debut' => '08:00', 'heure_fin' => '12:00', 'type' => 'bloquant', 'motif' => 'Autre établissement',
        ])->assertStatus(201);

        $this->getJson("/api/enseignants/{$ens->id}/indisponibilites")->assertStatus(200)->assertJsonCount(1);
        $this->getJson('/api/indisponibilites')->assertStatus(200)->assertJsonCount(1);
        $this->deleteJson('/api/indisponibilites/'.$r->json('id'))->assertStatus(204);
    }

    /** @test */
    public function indisponibilite_rejet_si_ni_plage_ni_intervalle(): void
    {
        $ens = Enseignant::create(['matricule_enseignant' => 'E1', 'nom_enseignant' => 'X', 'prenoms_enseignant' => 'Y']);

        $this->postJson("/api/enseignants/{$ens->id}/indisponibilites", ['jour' => 'lundi'])
            ->assertStatus(422);
    }

    // ── 0.3 Salle attitrée ──────────────────────────────────────────────────

    /** @test */
    public function classe_accepte_salle_attitree(): void
    {
        $niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e']);
        $salle = Salle::create(['nom' => 'A1', 'capacite' => 40, 'type' => 'classe']);

        $this->postJson('/api/classes', [
            'num_classe' => '1', 'nom_classe' => '6e A', 'abbr_classe' => '6A',
            'niveau_id' => $niveau->id, 'salle_id' => $salle->id,
        ])->assertStatus(201);

        $this->assertDatabaseHas('classes', ['abbr_classe' => '6A', 'salle_id' => $salle->id]);
    }

    // ── 0.6 Seeders (grille + séances) ──────────────────────────────────────

    /** @test */
    public function seeders_grille_et_seances_sont_idempotents(): void
    {
        $niveau = Niveau::create(['nom_niveau' => '3ème', 'abbr_niveau' => '3e']);
        $fr = Matiere::create(['abbr_matiere' => 'CFR', 'libelle_matiere' => 'Français', 'description_matiere' => 'x', 'famille' => 'francais']);
        $hg = Matiere::create(['abbr_matiere' => 'HG', 'libelle_matiere' => 'Hist-Géo', 'description_matiere' => 'x', 'famille' => 'hist_geo']);
        VolumeHoraire::create(['niveau_id' => $niveau->id, 'matiere_id' => $fr->id, 'heures_semaine' => 5, 'semaines_annee' => 36]);
        VolumeHoraire::create(['niveau_id' => $niveau->id, 'matiere_id' => $hg->id, 'heures_semaine' => 3, 'semaines_annee' => 36]);
        NiveauMatiere::create(['niveau_id' => $niveau->id, 'matiere_id' => $fr->id, 'obligatoire' => true, 'coefficient' => 3]);
        NiveauMatiere::create(['niveau_id' => $niveau->id, 'matiere_id' => $hg->id, 'obligatoire' => true, 'coefficient' => 3]);

        $this->seed(\Database\Seeders\PlageHoraireSeeder::class);
        $this->seed(\Database\Seeders\SeanceTypeSeeder::class);
        $apres1 = [PlageHoraire::count(), \App\Models\SeanceType::count()];

        $this->seed(\Database\Seeders\PlageHoraireSeeder::class);
        $this->seed(\Database\Seeders\SeanceTypeSeeder::class);
        $apres2 = [PlageHoraire::count(), \App\Models\SeanceType::count()];

        $this->assertEquals($apres1, $apres2, 'Les seeders EDT doivent être idempotents.');
        $this->assertGreaterThan(20, $apres1[0]); // plusieurs jours de plages
        // Français (famille double) : une séance de 110 min
        $this->assertDatabaseHas('seances_types', ['duree_minutes' => 110]);
    }

    // ── 0.6 Diagnostic ──────────────────────────────────────────────────────

    /** @test */
    public function diagnostic_signale_les_manques_et_devient_pret(): void
    {
        $diag = $this->getJson('/api/edt/diagnostic-prerequis')->assertStatus(200);
        $this->assertFalse($diag->json('pret'));

        // On configure le minimum : grille + familles + programme + séances + salle
        foreach (['lundi'] as $j) {
            for ($i = 1; $i <= 4; $i++) {
                PlageHoraire::create([
                    'libelle' => "M{$i}", 'jour' => $j, 'ordre' => $i,
                    'heure_debut' => sprintf('%02d:00', 7 + $i), 'heure_fin' => sprintf('%02d:00', 8 + $i), 'type' => 'cours',
                ]);
            }
        }
        $salle = Salle::create(['nom' => 'A1', 'capacite' => 40, 'type' => 'classe']);
        $niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e']);
        $matiere = Matiere::create(['abbr_matiere' => 'MATHS', 'libelle_matiere' => 'Maths', 'description_matiere' => 'x', 'famille' => 'maths']);
        $classe = Classe::create([
            'num_classe' => '1', 'nom_classe' => '6e A', 'abbr_classe' => '6A',
            'niveau_id' => $niveau->id, 'salle_id' => $salle->id, 'effectif_max_classe' => 30,
        ]);
        $ens = Enseignant::create(['matricule_enseignant' => 'E1', 'nom_enseignant' => 'X', 'prenoms_enseignant' => 'Y']);
        $nm = NiveauMatiere::create(['niveau_id' => $niveau->id, 'matiere_id' => $matiere->id, 'obligatoire' => true, 'coefficient' => 4]);
        \App\Models\SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 4]);
        \Illuminate\Support\Facades\DB::table('classe_enseignant_matiere')->insert([
            'classe_id' => $classe->id, 'enseignant_id' => $ens->id, 'matiere_id' => $matiere->id,
        ]);

        $diag = $this->getJson('/api/edt/diagnostic-prerequis')->assertStatus(200);
        $this->assertTrue($diag->json('pret'), 'Diagnostic devrait être prêt : '.json_encode($diag->json('blocs')));
    }
}
