<?php

namespace Tests\Feature;

use App\Models\Eleve;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class ImportEleveTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    private function fichierImport(array $lignes): UploadedFile
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'instructions');
        $sheet->fromArray(['Matricule', 'Nom', 'Prénoms', 'Genre'], null, 'A2');

        $row = 3;
        foreach ($lignes as $ligne) {
            $col = 'A';
            foreach ($ligne as $valeur) {
                $sheet->setCellValue("{$col}{$row}", $valeur);
                $col++;
            }
            $row++;
        }

        $path = tempnam(sys_get_temp_dir(), 'import_eleves') . '.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    /** @test */
    public function import_ignore_la_ligne_dexemple_du_template(): void
    {
        $niveau = $this->creerNiveau('6ème', '6e');
        $classe = $this->creerClasse($niveau->id, '6ème A', '6eA');

        $fichier = $this->fichierImport([
            ['EL001', 'KONE', 'Aminata', 'F', '20/05/2010', 'Abidjan', 'Ivoirienne', 'Cocody', '6eA', '', '', 'O', '', ''],
        ]);

        $response = $this->postJson('/api/eleves/import', ['fichier' => $fichier]);

        $response->assertStatus(200)->assertJsonPath('inseres', 0);
        $this->assertDatabaseMissing('eleves', ['matricule_eleve' => 'EL001']);
    }

    /** @test */
    public function import_rejette_une_valeur_de_handicap_hors_enum(): void
    {
        $niveau = $this->creerNiveau('6ème', '6e');
        $classe = $this->creerClasse($niveau->id, '6ème A', '6eA');

        $fichier = $this->fichierImport([
            ['ELV200', 'TRAORE', 'Awa', 'F', '01/01/2010', 'Abidjan', 'Ivoirienne', 'Cocody', '6eA', '', '', 'N', 'mental', ''],
        ]);

        $response = $this->postJson('/api/eleves/import', ['fichier' => $fichier]);

        $response->assertStatus(200)->assertJsonPath('inseres', 0);
        $response->assertJsonPath('erreurs.0.ligne', 3);
        $this->assertDatabaseMissing('eleves', ['matricule_eleve' => 'ELV200']);
    }

    /** @test */
    public function import_accepte_une_valeur_de_handicap_valide(): void
    {
        $niveau = $this->creerNiveau('6ème', '6e');
        $classe = $this->creerClasse($niveau->id, '6ème A', '6eA');

        $fichier = $this->fichierImport([
            ['ELV201', 'TRAORE', 'Awa', 'F', '01/01/2010', 'Abidjan', 'Ivoirienne', 'Cocody', '6eA', '', '', 'N', 'albinisme', ''],
        ]);

        $response = $this->postJson('/api/eleves/import', ['fichier' => $fichier]);

        $response->assertStatus(200)->assertJsonPath('inseres', 1);
        $eleve = Eleve::where('matricule_eleve', 'ELV201')->first();
        $this->assertNotNull($eleve);
        $this->assertEquals(['albinisme'], $eleve->types_handicap);
    }

    /** @test */
    public function import_ne_sarrete_pas_sur_une_ligne_vide_au_milieu_du_fichier(): void
    {
        $niveau = $this->creerNiveau('6ème', '6e');
        $classe = $this->creerClasse($niveau->id, '6ème A', '6eA');

        $fichier = $this->fichierImport([
            ['ELV210', 'KOUAME', 'Yao', 'M', '01/01/2010', 'Abidjan', 'Ivoirienne', 'Cocody', '6eA', '', '', 'N', '', ''],
            ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['ELV211', 'KOUAME', 'Aya', 'F', '01/01/2010', 'Abidjan', 'Ivoirienne', 'Cocody', '6eA', '', '', 'N', '', ''],
        ]);

        $response = $this->postJson('/api/eleves/import', ['fichier' => $fichier]);

        $response->assertStatus(200)->assertJsonPath('inseres', 2);
        $this->assertDatabaseHas('eleves', ['matricule_eleve' => 'ELV210']);
        $this->assertDatabaseHas('eleves', ['matricule_eleve' => 'ELV211']);
    }
}
