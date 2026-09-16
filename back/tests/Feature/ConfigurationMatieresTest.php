<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\ClasseMatiere;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\NiveauMatiere;
use App\Models\SeanceType;
use App\Models\VolumeHoraire;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Décocher une matière à l'Étape 1 (matières de l'établissement) doit aussi
 * retirer son programme de l'Étape 2 (niveaux/séries), sinon les deux écrans
 * se désynchronisent : la matière disparaît de la liste de l'Étape 2 (filtrée
 * sur les matières de l'établissement) sans que sa configuration par niveau
 * soit réellement supprimée, et le générateur continue de la réclamer.
 */
class ConfigurationMatieresTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    private function etablirCatalogue(array $matiereIds): void
    {
        foreach ($matiereIds as $id) {
            DB::table('etablissement_matieres')->insert([
                'matiere_id' => $id, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    /** @test */
    public function retirer_une_matiere_non_utilisee_ne_demande_pas_confirmation(): void
    {
        $tic = Matiere::create(['abbr_matiere' => 'TIC', 'libelle_matiere' => 'TIC', 'description_matiere' => 'x']);
        $maths = Matiere::create(['abbr_matiere' => 'MATHS', 'libelle_matiere' => 'Maths', 'description_matiere' => 'x']);
        $this->etablirCatalogue([$tic->id, $maths->id]);

        $this->postJson('/api/config-matieres/etablissement', ['matiere_ids' => [$maths->id]])
            ->assertStatus(200);

        $this->assertDatabaseCount('etablissement_matieres', 1);
    }

    /** @test */
    public function retirer_une_matiere_utilisee_demande_confirmation_et_ne_supprime_rien_sans_elle(): void
    {
        $tic = Matiere::create(['abbr_matiere' => 'TIC', 'libelle_matiere' => 'TIC', 'description_matiere' => 'x']);
        $niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e']);
        $nm = NiveauMatiere::create(['niveau_id' => $niveau->id, 'matiere_id' => $tic->id, 'obligatoire' => true, 'coefficient' => 1]);
        $this->etablirCatalogue([$tic->id]);

        $r = $this->postJson('/api/config-matieres/etablissement', ['matiere_ids' => []])
            ->assertStatus(409);

        $r->assertJsonPath('necessite_confirmation', true);
        $r->assertJsonPath('impact.0.libelle_matiere', 'TIC');
        $r->assertJsonPath('impact.0.nb_niveaux', 1);

        // Rien n'a bougé : ni le catalogue, ni le programme du niveau.
        $this->assertDatabaseHas('etablissement_matieres', ['matiere_id' => $tic->id]);
        $this->assertDatabaseHas('niveau_matieres', ['id' => $nm->id]);
    }

    /** @test */
    public function retirer_avec_confirmation_supprime_le_programme_de_tous_les_niveaux(): void
    {
        $tic = Matiere::create(['abbr_matiere' => 'TIC', 'libelle_matiere' => 'TIC', 'description_matiere' => 'x']);
        $maths = Matiere::create(['abbr_matiere' => 'MATHS', 'libelle_matiere' => 'Maths', 'description_matiere' => 'x']);
        $niveau1 = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e']);
        $niveau2 = Niveau::create(['nom_niveau' => '5ème', 'abbr_niveau' => '5e']);
        $classe = Classe::create(['num_classe' => '1', 'nom_classe' => '6e A', 'abbr_classe' => '6A', 'niveau_id' => $niveau1->id]);

        $nm1 = NiveauMatiere::create(['niveau_id' => $niveau1->id, 'matiere_id' => $tic->id, 'obligatoire' => true, 'coefficient' => 1]);
        NiveauMatiere::create(['niveau_id' => $niveau2->id, 'matiere_id' => $tic->id, 'obligatoire' => true, 'coefficient' => 1]);
        $nmMaths = NiveauMatiere::create(['niveau_id' => $niveau1->id, 'matiere_id' => $maths->id, 'obligatoire' => true, 'coefficient' => 4]);
        SeanceType::create(['niveau_matiere_id' => $nm1->id, 'duree_minutes' => 55, 'nb_seances' => 1]);
        VolumeHoraire::create(['niveau_id' => $niveau1->id, 'matiere_id' => $tic->id, 'heures_semaine' => 1, 'semaines_annee' => 32]);
        ClasseMatiere::create(['classe_id' => $classe->id, 'matiere_id' => $tic->id, 'groupe_alternatif_id' => null]);
        $this->etablirCatalogue([$tic->id, $maths->id]);

        $this->postJson('/api/config-matieres/etablissement', [
            'matiere_ids' => [$maths->id],
            'confirmer_suppression' => true,
        ])->assertStatus(200);

        $this->assertDatabaseMissing('etablissement_matieres', ['matiere_id' => $tic->id]);
        $this->assertDatabaseHas('etablissement_matieres', ['matiere_id' => $maths->id]);
        $this->assertDatabaseCount('niveau_matieres', 1); // seul Maths reste
        $this->assertDatabaseHas('niveau_matieres', ['id' => $nmMaths->id]);
        $this->assertDatabaseCount('seances_types', 0); // cascade
        $this->assertDatabaseMissing('volumes_horaires', ['matiere_id' => $tic->id]);
        $this->assertDatabaseMissing('classe_matieres', ['matiere_id' => $tic->id]);
    }

    /** @test */
    public function garder_une_matiere_deja_cochee_ne_declenche_aucune_suppression(): void
    {
        $tic = Matiere::create(['abbr_matiere' => 'TIC', 'libelle_matiere' => 'TIC', 'description_matiere' => 'x']);
        $niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e']);
        $nm = NiveauMatiere::create(['niveau_id' => $niveau->id, 'matiere_id' => $tic->id, 'obligatoire' => true, 'coefficient' => 1]);
        $this->etablirCatalogue([$tic->id]);

        // On renvoie exactement la même sélection (aucun retrait) : pas de 409.
        $this->postJson('/api/config-matieres/etablissement', ['matiere_ids' => [$tic->id]])
            ->assertStatus(200);

        $this->assertDatabaseHas('niveau_matieres', ['id' => $nm->id]);
    }
}
