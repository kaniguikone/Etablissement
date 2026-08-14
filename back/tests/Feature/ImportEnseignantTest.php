<?php

namespace Tests\Feature;

use App\Models\CentralEnseignantLink;
use App\Models\CentralUser;
use App\Models\Enseignant;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Stancl\Tenancy\Contracts\Tenant as TenantContract;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class ImportEnseignantTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();

        // Les modèles "central" (CentralUser...) forcent la connexion 'mysql' ; en
        // test, on la fait pointer vers la même base SQLite en mémoire (les
        // migrations centrales y sont déjà appliquées via la connexion par défaut).
        DB::connection('mysql')->setPdo(DB::connection()->getPdo());

        // CentralUser::lierEnseignant() nécessite un tenant courant (helper tenant())
        // et une ligne réelle en base (FK central_enseignant_links.tenant_id).
        // Insertion directe (hors Eloquent) pour éviter le provisionnement réel
        // d'une base de données déclenché par les events du modèle Tenant.
        DB::table('tenants')->insert(['id' => 'tenant-test', 'nom' => 'École Test', 'actif' => true]);
        app()->instance(TenantContract::class, Tenant::find('tenant-test'));
    }

    private function fichierImport(array $lignes): UploadedFile
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'instructions');
        $sheet->fromArray(['Matricule', 'Nom', 'Prénoms'], null, 'A2');

        $row = 3;
        foreach ($lignes as $ligne) {
            $col = 'A';
            foreach ($ligne as $valeur) {
                $sheet->setCellValue("{$col}{$row}", $valeur);
                $col++;
            }
            $row++;
        }

        $path = tempnam(sys_get_temp_dir(), 'import_enseignants') . '.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    /** @test */
    public function import_ignore_la_ligne_dexemple_du_template(): void
    {
        $fichier = $this->fichierImport([
            ['ENS001', 'KONE', 'Abou', 'M', '0701020304', 'abou@ecole.ci', '15/03/1985', '01/09/2020', 'CDI', 'N'],
        ]);

        $response = $this->postJson('/api/enseignants/import', ['fichier' => $fichier]);

        $response->assertStatus(200)->assertJsonPath('inseres', 0);
        $this->assertDatabaseMissing('enseignants', ['matricule_enseignant' => 'ENS001']);
    }

    /** @test */
    public function import_sans_creer_acces_ne_cree_pas_de_compte_portail(): void
    {
        $fichier = $this->fichierImport([
            ['ENS100', 'TRAORE', 'Awa', 'F', '0701020399', 'awa@ecole.ci', '15/03/1985', '01/09/2020', 'CDI', 'N'],
        ]);

        $response = $this->postJson('/api/enseignants/import', ['fichier' => $fichier]);

        $response->assertStatus(200)->assertJsonPath('inseres', 1);

        $enseignant = Enseignant::where('matricule_enseignant', 'ENS100')->first();
        $this->assertNotNull($enseignant);
        $this->assertNull($enseignant->password);
        $this->assertNull($enseignant->central_user_id);
        $this->assertDatabaseMissing('central_users', ['telephone' => '0701020399']);
    }

    /** @test */
    public function import_avec_creer_acces_genere_un_mot_de_passe_aleatoire_non_previsible(): void
    {
        $fichier = $this->fichierImport([
            ['ENS101', 'TRAORE', 'Koffi', 'M', '0701020398', 'koffi@ecole.ci', '15/03/1985', '01/09/2020', 'CDI', 'O'],
        ]);

        $response = $this->postJson('/api/enseignants/import', ['fichier' => $fichier]);

        $response->assertStatus(200)->assertJsonPath('inseres', 1);

        $enseignant = Enseignant::where('matricule_enseignant', 'ENS101')->first();
        $this->assertNotNull($enseignant);
        $this->assertNotNull($enseignant->password);
        $this->assertFalse(\Illuminate\Support\Facades\Hash::check('Enseignant@ENS101', $enseignant->password));
        $this->assertNotNull($enseignant->central_user_id);

        $central = CentralUser::where('telephone', '0701020398')->first();
        $this->assertNotNull($central);
        $this->assertTrue(
            CentralEnseignantLink::where('central_user_id', $central->id)
                ->where('local_enseignant_id', $enseignant->id)
                ->exists()
        );
    }

    /** @test */
    public function import_avec_creer_acces_sans_telephone_est_rejete(): void
    {
        $fichier = $this->fichierImport([
            ['ENS102', 'TRAORE', 'Sita', 'F', '', 'sita@ecole.ci', '15/03/1985', '01/09/2020', 'CDI', 'O'],
        ]);

        $response = $this->postJson('/api/enseignants/import', ['fichier' => $fichier]);

        $response->assertStatus(200)->assertJsonPath('inseres', 0);
        $this->assertDatabaseMissing('enseignants', ['matricule_enseignant' => 'ENS102']);
    }
}
