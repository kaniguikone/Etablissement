<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\Enseignant;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\EmploiDuTemps;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmploiDuTempsTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    private Classe $classe;
    private Matiere $matiere;
    private Enseignant $enseignant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();

        $niveau = Niveau::create(['nom_niveau' => '6ème', 'abbr_niveau' => '6e']);
        $this->classe = Classe::create([
            'num_classe' => '1', 'nom_classe' => '6ème A', 'abbr_classe' => '6A', 'niveau_id' => $niveau->id,
        ]);
        $this->matiere = Matiere::create([
            'libelle_matiere'      => 'Mathématiques',
            'abbr_matiere'         => 'MATHS',
            'description_matiere'  => 'Test',
        ]);
        $this->enseignant = Enseignant::create([
            'matricule_enseignant' => 'ENS001',
            'nom_enseignant' => 'DIALLO',
            'prenoms_enseignant' => 'Oumar',
        ]);
    }

    private function creneauValide(array $override = []): array
    {
        return array_merge([
            'classe_id'     => $this->classe->id,
            'matiere_id'    => $this->matiere->id,
            'enseignant_id' => $this->enseignant->id,
            'jour'          => 'lundi',
            'heure_debut'   => '08:00',
            'heure_fin'     => '10:00',
        ], $override);
    }

    /** @test */
    public function creation_creneau_valide(): void
    {
        $response = $this->postJson('/api/emploiDuTemps', $this->creneauValide());
        $response->assertStatus(201);
        $this->assertDatabaseHas('emploi_du_temps', ['jour' => 'lundi']);
    }

    /** @test */
    public function rejet_si_heure_fin_avant_heure_debut(): void
    {
        $response = $this->postJson('/api/emploiDuTemps', $this->creneauValide([
            'heure_debut' => '10:00',
            'heure_fin'   => '08:00',
        ]));
        $response->assertStatus(422);
    }

    /** @test */
    public function rejet_si_chevauchement_classe(): void
    {
        // Créer un créneau existant : lundi 08:00–10:00
        EmploiDuTemps::create($this->creneauValide());

        // Tentative de chevauchement : lundi 09:00–11:00 (même classe)
        $response = $this->postJson('/api/emploiDuTemps', $this->creneauValide([
            'heure_debut' => '09:00',
            'heure_fin'   => '11:00',
        ]));

        $response->assertStatus(422)
                 ->assertJsonPath('message', 'Chevauchement horaire détecté.');
    }

    /** @test */
    public function rejet_si_chevauchement_enseignant(): void
    {
        $autreMatiere = Matiere::create(['libelle_matiere' => 'Français', 'abbr_matiere' => 'FR', 'description_matiere' => 'Test']);
        $autreClasse  = Classe::create([
            'num_classe' => '2', 'nom_classe' => '6ème B', 'abbr_classe' => '6B',
            'niveau_id'  => $this->classe->niveau_id,
        ]);

        // L'enseignant est occupé lundi 08:00–10:00 avec la première classe
        EmploiDuTemps::create($this->creneauValide());

        // Tenter de l'affecter à une AUTRE classe au même moment
        $response = $this->postJson('/api/emploiDuTemps', [
            'classe_id'     => $autreClasse->id,
            'matiere_id'    => $autreMatiere->id,
            'enseignant_id' => $this->enseignant->id,
            'jour'          => 'lundi',
            'heure_debut'   => '08:30',
            'heure_fin'     => '10:30',
        ]);

        $response->assertStatus(422)
                 ->assertJsonPath('message', 'Chevauchement horaire détecté.');
    }

    /** @test */
    public function pas_de_chevauchement_si_autre_jour(): void
    {
        EmploiDuTemps::create($this->creneauValide(['jour' => 'lundi']));

        // Même horaire mais un autre jour : pas de conflit
        $response = $this->postJson('/api/emploiDuTemps', $this->creneauValide(['jour' => 'mardi']));
        $response->assertStatus(201);
    }

    /** @test */
    public function suppression_creneau(): void
    {
        $creneau = EmploiDuTemps::create($this->creneauValide());
        $this->deleteJson("/api/emploiDuTemps/{$creneau->id}")->assertStatus(204);
        $this->assertDatabaseMissing('emploi_du_temps', ['id' => $creneau->id]);
    }
}
