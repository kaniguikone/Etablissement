<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\EmploiDuTemps;
use App\Models\Enseignant;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\PlageHoraire;
use App\Models\Salle;
use App\Models\VolumeHoraire;
use App\Services\Edt\Validateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Chantier EDT — Lot 1 : catalogue de contraintes MENET + validateur.
 */
class EdtValidateurTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    private Niveau $niveau;

    private Classe $classe;

    private Enseignant $prof;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
        $this->seed(\Database\Seeders\EdtContrainteSeeder::class);

        $this->niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e', 'ordre' => 1]);
        $this->classe = Classe::create([
            'num_classe' => '1', 'nom_classe' => '6ème A', 'abbr_classe' => '6A',
            'niveau_id' => $this->niveau->id, 'effectif_max_classe' => 35,
        ]);
        $this->prof = Enseignant::create(['matricule_enseignant' => 'E1', 'nom_enseignant' => 'DIALLO', 'prenoms_enseignant' => 'O']);

        foreach ([['07:30', '08:25'], ['08:25', '09:20'], ['09:20', '10:15'], ['10:30', '11:25'], ['15:00', '15:55']] as $i => [$d, $f]) {
            PlageHoraire::create(['libelle' => 'P'.($i + 1), 'jour' => null, 'ordre' => $i + 1, 'heure_debut' => $d, 'heure_fin' => $f, 'type' => 'cours']);
        }
    }

    private function matiere(string $abbr, ?string $famille = null, ?string $salleType = null, bool $effort = false): Matiere
    {
        return Matiere::create([
            'abbr_matiere' => $abbr, 'libelle_matiere' => $abbr, 'description_matiere' => 'x',
            'famille' => $famille, 'salle_type_requis' => $salleType, 'effort_soutenu' => $effort,
        ]);
    }

    private function creneau(array $attr): EmploiDuTemps
    {
        return EmploiDuTemps::create(array_merge([
            'classe_id' => $this->classe->id,
            'enseignant_id' => $this->prof->id,
            'jour' => 'lundi',
            'heure_debut' => '07:30',
            'heure_fin' => '08:25',
        ], $attr));
    }

    private function analyser(): array
    {
        $creneaux = EmploiDuTemps::with(['classe.niveau', 'matiere', 'enseignant', 'salle'])->get();

        return (new Validateur)->analyser($creneaux);
    }

    private function codes(array $rapport): array
    {
        return collect($rapport['violations'])->pluck('code')->unique()->values()->all();
    }

    /** @test */
    public function edt_sain_ne_produit_aucune_violation_dure(): void
    {
        $m = $this->matiere('MATHS', 'maths');
        $this->creneau(['matiere_id' => $m->id, 'jour' => 'lundi', 'heure_debut' => '07:30', 'heure_fin' => '08:25']);
        $this->creneau(['matiere_id' => $m->id, 'jour' => 'mardi', 'heure_debut' => '07:30', 'heure_fin' => '08:25']);

        $this->assertSame(0, $this->analyser()['nb_dures']);
    }

    /** @test */
    public function detecte_enseignant_double_booke(): void
    {
        $autreClasse = Classe::create(['num_classe' => '2', 'nom_classe' => '6ème B', 'abbr_classe' => '6B', 'niveau_id' => $this->niveau->id]);
        $m = $this->matiere('MATHS', 'maths');
        $this->creneau(['matiere_id' => $m->id, 'heure_debut' => '07:30', 'heure_fin' => '08:25']);
        $this->creneau(['matiere_id' => $m->id, 'classe_id' => $autreClasse->id, 'heure_debut' => '07:30', 'heure_fin' => '08:25']);

        $this->assertContains('ENSEIGNANT_DOUBLE', $this->codes($this->analyser()));
    }

    /** @test */
    public function detecte_eps_en_heures_chaudes(): void
    {
        $eps = $this->matiere('EPS', 'eps', 'gymnase');
        $gym = Salle::create(['nom' => 'Gymnase', 'type' => 'gymnase', 'capacite' => 60]);
        $this->creneau(['matiere_id' => $eps->id, 'salle_id' => $gym->id, 'heure_debut' => '10:30', 'heure_fin' => '11:25']);

        $this->assertContains('EPS_HEURES_CHAUDES', $this->codes($this->analyser()));
    }

    /** @test */
    public function detecte_hg_sur_deux_heures_consecutives(): void
    {
        $hg = $this->matiere('HG', 'hist_geo');
        $this->creneau(['matiere_id' => $hg->id, 'heure_debut' => '08:25', 'heure_fin' => '09:20']);
        $this->creneau(['matiere_id' => $hg->id, 'heure_debut' => '09:20', 'heure_fin' => '10:15']);

        $this->assertContains('HG_PAS_CONSECUTIF', $this->codes($this->analyser()));
    }

    /** @test */
    public function pc_svt_exemptes_ne_declenchent_pas_matiere_consecutive_mais_anglais_oui(): void
    {
        $ang = $this->matiere('ANG', 'anglais');
        $this->creneau(['matiere_id' => $ang->id, 'heure_debut' => '08:25', 'heure_fin' => '09:20']);
        $this->creneau(['matiere_id' => $ang->id, 'heure_debut' => '09:20', 'heure_fin' => '10:15']);

        $this->assertContains('MATIERE_CONSECUTIVE', $this->codes($this->analyser()));
    }

    /** @test */
    public function detecte_salle_specialisee_manquante_pour_svt(): void
    {
        $svt = $this->matiere('SVT', 'svt', 'labo');
        $salleClasse = Salle::create(['nom' => 'A1', 'type' => 'classe', 'capacite' => 40]);
        $this->creneau(['matiere_id' => $svt->id, 'salle_id' => $salleClasse->id]);

        $this->assertContains('SALLE_SPECIALISEE', $this->codes($this->analyser()));
    }

    /** @test */
    public function detecte_capacite_salle_insuffisante(): void
    {
        $m = $this->matiere('MATHS', 'maths');
        $petiteSalle = Salle::create(['nom' => 'B2', 'type' => 'classe', 'capacite' => 20]);
        $this->creneau(['matiere_id' => $m->id, 'salle_id' => $petiteSalle->id]);

        $this->assertContains('CAPACITE_SALLE', $this->codes($this->analyser()));
    }

    /** @test */
    public function detecte_ecart_de_volume_horaire(): void
    {
        $m = $this->matiere('MATHS', 'maths');
        VolumeHoraire::create(['niveau_id' => $this->niveau->id, 'matiere_id' => $m->id, 'heures_semaine' => 4, 'semaines_annee' => 36]);
        $this->creneau(['matiere_id' => $m->id, 'heure_debut' => '07:30', 'heure_fin' => '08:25']); // ~0.9h seulement

        $this->assertContains('VOLUME_HORAIRE', $this->codes($this->analyser()));
    }

    /** @test */
    public function detecte_indisponibilite_bloquante(): void
    {
        $m = $this->matiere('MATHS', 'maths');
        \App\Models\EnseignantIndisponibilite::create([
            'enseignant_id' => $this->prof->id, 'jour' => 'lundi',
            'heure_debut' => '07:00', 'heure_fin' => '12:00', 'type' => 'bloquant',
        ]);
        $this->creneau(['matiere_id' => $m->id, 'jour' => 'lundi', 'heure_debut' => '08:25', 'heure_fin' => '09:20']);

        $this->assertContains('INDISPO_BLOQUANTE', $this->codes($this->analyser()));
    }

    /** @test */
    public function endpoint_controle_retourne_le_rapport(): void
    {
        $m = $this->matiere('HG', 'hist_geo');
        $this->creneau(['matiere_id' => $m->id, 'heure_debut' => '08:25', 'heure_fin' => '09:20']);
        $this->creneau(['matiere_id' => $m->id, 'heure_debut' => '09:20', 'heure_fin' => '10:15']);

        $this->getJson('/api/edt/controle')
            ->assertStatus(200)
            ->assertJsonStructure(['score', 'nb_dures', 'nb_souples', 'nb_creneaux', 'violations' => [['code', 'nature', 'message']]]);
    }

    /** @test */
    public function contrainte_dure_non_desactivable_via_api(): void
    {
        $this->putJson('/api/edt/contraintes/ENSEIGNANT_DOUBLE', ['active' => false])
            ->assertStatus(200);

        $this->assertTrue(\App\Models\EdtContrainte::where('code', 'ENSEIGNANT_DOUBLE')->first()->active);
    }

    /** @test */
    public function contrainte_souple_ponderable_via_api(): void
    {
        $this->putJson('/api/edt/contraintes/TROUS_ENSEIGNANT', ['poids' => 12, 'active' => false])
            ->assertStatus(200);

        $c = \App\Models\EdtContrainte::where('code', 'TROUS_ENSEIGNANT')->first();
        $this->assertSame(12, $c->poids);
        $this->assertFalse($c->active);
    }
}
