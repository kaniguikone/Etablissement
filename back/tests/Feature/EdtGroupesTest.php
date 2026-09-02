<?php

namespace Tests\Feature;

use App\Models\Classe;
use App\Models\EmploiDuTemps;
use App\Models\Enseignant;
use App\Models\GroupePedagogique;
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
 * Chantier EDT — Lot 4 : groupes pédagogiques (LV2, dédoublements) et quinzaine.
 */
class EdtGroupesTest extends TestCase
{
    use RefreshDatabase, \Tests\Support\CreatesTestData;

    private Niveau $niveau;

    private Classe $classe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
        $this->seed(\Database\Seeders\EdtContrainteSeeder::class);

        foreach ([['08:00', '09:00'], ['09:00', '10:00'], ['10:15', '11:15'], ['11:15', '12:15'], ['14:00', '15:00']] as $i => [$d, $f]) {
            PlageHoraire::create(['libelle' => 'P'.($i + 1), 'jour' => null, 'ordre' => $i + 1, 'heure_debut' => $d, 'heure_fin' => $f, 'type' => 'cours']);
        }

        $this->niveau = Niveau::create(['nom_niveau' => '4ème', 'abbr_niveau' => '4e', 'ordre' => 3]);
        $this->classe = Classe::create(['num_classe' => '1', 'nom_classe' => '4ème A', 'abbr_classe' => '4A', 'niveau_id' => $this->niveau->id, 'effectif_max_classe' => 30]);

        // Maths au programme normal (2 h)
        $maths = Matiere::create(['abbr_matiere' => 'MATHS', 'libelle_matiere' => 'Maths', 'description_matiere' => 'x', 'famille' => 'maths']);
        VolumeHoraire::create(['niveau_id' => $this->niveau->id, 'matiere_id' => $maths->id, 'heures_semaine' => 2, 'semaines_annee' => 36]);
        $nm = NiveauMatiere::create(['niveau_id' => $this->niveau->id, 'matiere_id' => $maths->id, 'obligatoire' => true, 'coefficient' => 4]);
        SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 2]);
        $profM = Enseignant::create(['matricule_enseignant' => 'EM', 'nom_enseignant' => 'MATH', 'prenoms_enseignant' => 'P']);
        \Illuminate\Support\Facades\DB::table('classe_enseignant_matiere')->insert(['classe_id' => $this->classe->id, 'enseignant_id' => $profM->id, 'matiere_id' => $maths->id]);
    }

    private function creerGroupesLv2(): array
    {
        $all = Matiere::create(['abbr_matiere' => 'ALL', 'libelle_matiere' => 'Allemand', 'description_matiere' => 'x', 'famille' => 'lv2']);
        $esp = Matiere::create(['abbr_matiere' => 'ESP', 'libelle_matiere' => 'Espagnol', 'description_matiere' => 'x', 'famille' => 'lv2']);
        $pa = Enseignant::create(['matricule_enseignant' => 'EA', 'nom_enseignant' => 'ALLEM', 'prenoms_enseignant' => 'P']);
        $pe = Enseignant::create(['matricule_enseignant' => 'EE', 'nom_enseignant' => 'ESPAG', 'prenoms_enseignant' => 'P']);

        $g1 = GroupePedagogique::create(['classe_id' => $this->classe->id, 'matiere_id' => $all->id, 'enseignant_id' => $pa->id, 'libelle' => 'Allemand', 'parallele_code' => 'LV2', 'nb_seances' => 2, 'effectif' => 15]);
        $g2 = GroupePedagogique::create(['classe_id' => $this->classe->id, 'matiere_id' => $esp->id, 'enseignant_id' => $pe->id, 'libelle' => 'Espagnol', 'parallele_code' => 'LV2', 'nb_seances' => 2, 'effectif' => 15]);

        return [$g1, $g2];
    }

    /** @test */
    public function le_crud_groupes_pedagogiques(): void
    {
        $m = Matiere::create(['abbr_matiere' => 'ALL', 'libelle_matiere' => 'Allemand', 'description_matiere' => 'x', 'famille' => 'lv2']);

        $r = $this->postJson('/api/groupes-pedagogiques', [
            'classe_id' => $this->classe->id, 'matiere_id' => $m->id,
            'libelle' => 'Allemand', 'parallele_code' => 'LV2', 'nb_seances' => 2,
        ])->assertStatus(201);

        $this->getJson('/api/groupes-pedagogiques?classe_id='.$this->classe->id)->assertStatus(200)->assertJsonCount(1);
        $this->deleteJson('/api/groupes-pedagogiques/'.$r->json('id'))->assertStatus(204);
    }

    /** @test */
    public function le_generateur_place_les_groupes_lv2_en_parallele(): void
    {
        $this->creerGroupesLv2();

        $resultat = (new Generateur)->generer(['jours' => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']]);

        $lv2 = collect($resultat['creneaux'])->filter(fn ($c) => $c['groupe_id'] !== null);
        // 2 groupes × 2 séances = 4 créneaux
        $this->assertCount(4, $lv2);

        // Pour chaque instant où il y a de la LV2, les 2 groupes sont présents
        $parInstant = $lv2->groupBy(fn ($c) => $c['jour'].' '.$c['heure_debut']);
        foreach ($parInstant as $cs) {
            $this->assertCount(2, collect($cs)->pluck('groupe_id')->unique());
        }
        $this->assertCount(2, $parInstant); // 2 créneaux LV2 dans la semaine

        // Aucun conflit dur
        foreach ($resultat['creneaux'] as $c) {
            EmploiDuTemps::withoutGlobalScope('officiel')->create($c + ['generation_id' => 777]);
        }
        $creneaux = EmploiDuTemps::withoutGlobalScope('officiel')->with(['classe.niveau', 'matiere', 'enseignant', 'salle'])->where('generation_id', 777)->get();
        $this->assertSame(0, (new Validateur)->analyser($creneaux)['nb_dures']);
    }

    /** @test */
    public function la_quinzaine_permet_deux_matieres_sur_le_meme_creneau(): void
    {
        // PC et SVT en quinzaine (1 séance chacune, alternées A/B via frequence)
        $pc = Matiere::create(['abbr_matiere' => 'PC', 'libelle_matiere' => 'Physique-Chimie', 'description_matiere' => 'x', 'famille' => 'pc']);
        $svt = Matiere::create(['abbr_matiere' => 'SVT', 'libelle_matiere' => 'SVT', 'description_matiere' => 'x', 'famille' => 'svt']);
        $prof = Enseignant::create(['matricule_enseignant' => 'ES', 'nom_enseignant' => 'SCI', 'prenoms_enseignant' => 'P']);

        foreach ([$pc, $svt] as $m) {
            VolumeHoraire::create(['niveau_id' => $this->niveau->id, 'matiere_id' => $m->id, 'heures_semaine' => 1, 'semaines_annee' => 36]);
            $nm = NiveauMatiere::create(['niveau_id' => $this->niveau->id, 'matiere_id' => $m->id, 'obligatoire' => true, 'coefficient' => 2]);
            SeanceType::create(['niveau_matiere_id' => $nm->id, 'duree_minutes' => 55, 'nb_seances' => 1, 'frequence' => 'quinzaine']);
            \Illuminate\Support\Facades\DB::table('classe_enseignant_matiere')->insert(['classe_id' => $this->classe->id, 'enseignant_id' => $prof->id, 'matiere_id' => $m->id]);
        }

        $resultat = (new Generateur)->generer([]);

        $sciences = collect($resultat['creneaux'])->whereIn('matiere_id', [$pc->id, $svt->id]);
        $this->assertCount(2, $sciences);
        // Chacune est en semaine A ou B (pas "toutes")
        foreach ($sciences as $c) {
            $this->assertContains($c['semaine'], ['A', 'B']);
        }

        // Insérées, elles ne créent pas de conflit dur même si au même créneau
        foreach ($resultat['creneaux'] as $c) {
            EmploiDuTemps::withoutGlobalScope('officiel')->create($c + ['generation_id' => 778]);
        }
        $creneaux = EmploiDuTemps::withoutGlobalScope('officiel')->with(['classe.niveau', 'matiere', 'enseignant', 'salle'])->where('generation_id', 778)->get();
        $this->assertSame(0, (new Validateur)->analyser($creneaux)['nb_dures']);
    }

    /** @test */
    public function le_validateur_signale_des_groupes_desynchronises(): void
    {
        [$g1, $g2] = $this->creerGroupesLv2();
        $prof1 = $g1->enseignant_id;
        $prof2 = $g2->enseignant_id;

        // Groupe 1 lundi 08:00, groupe 2 mardi 08:00 → désynchronisés
        $p = PlageHoraire::first();
        EmploiDuTemps::create(['classe_id' => $this->classe->id, 'matiere_id' => $g1->matiere_id, 'enseignant_id' => $prof1, 'groupe_id' => $g1->id, 'jour' => 'lundi', 'plage_horaire_id' => $p->id, 'heure_debut' => '08:00', 'heure_fin' => '09:00']);
        EmploiDuTemps::create(['classe_id' => $this->classe->id, 'matiere_id' => $g2->matiere_id, 'enseignant_id' => $prof2, 'groupe_id' => $g2->id, 'jour' => 'mardi', 'plage_horaire_id' => $p->id, 'heure_debut' => '08:00', 'heure_fin' => '09:00']);

        $rapport = (new Validateur)->analyser(EmploiDuTemps::with(['classe.niveau', 'matiere', 'enseignant', 'salle'])->get());
        $this->assertContains('GROUPES_PARALLELES', collect($rapport['violations'])->pluck('code')->all());
    }
}
