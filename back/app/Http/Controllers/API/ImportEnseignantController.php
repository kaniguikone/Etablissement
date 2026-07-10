<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CentralUser;
use App\Models\Enseignant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ImportEnseignantController extends Controller
{
    private array $colonnes = [
        'A' => 'Matricule *',
        'B' => 'Nom *',
        'C' => 'Prénoms *',
        'D' => 'Genre',
        'E' => 'Téléphone',
        'F' => 'Email',
        'G' => 'Date de naissance (AAAA-MM-JJ)',
        'H' => 'Date d\'embauche (AAAA-MM-JJ)',
        'I' => 'Statut',
    ];

    public function template()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Enseignants');

        // Ligne 1 : instructions (sautée à l'import)
        $sheet->setCellValue('A1', '* Champs obligatoires. Ne pas modifier les en-têtes (ligne 2). Supprimer la ligne d\'exemple (ligne 3) avant import.');
        $sheet->mergeCells('A1:I1');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '856404']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fff3cd']],
        ]);

        // Ligne 2 : en-têtes
        foreach ($this->colonnes as $col => $label) {
            $sheet->setCellValue("{$col}2", $label);
        }
        $sheet->getStyle('A2:I2')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Ligne 3 : exemple
        $exemples = ['ENS001', 'KONE', 'Abou', 'M', '0701020304', 'abou@ecole.ci', '1985-03-15', '2020-09-01', 'CDI'];
        foreach (array_values($exemples) as $i => $valeur) {
            $col = chr(65 + $i);
            $sheet->setCellValue("{$col}3", $valeur);
        }
        $sheet->getStyle('A3:I3')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'e8f0fe']],
        ]);

        // Dropdowns Genre (D3:D1001) et Statut (I3:I1001)
        foreach (range(3, 1001) as $row) {
            $v = $sheet->getCell("D{$row}")->getDataValidation();
            $v->setType(DataValidation::TYPE_LIST)
                ->setErrorStyle(DataValidation::STYLE_STOP)
                ->setAllowBlank(true)->setShowDropDown(true)
                ->setShowErrorMessage(true)
                ->setErrorTitle('Valeur invalide')->setError('Choisir M ou F')
                ->setFormula1('"M,F"');

            $v2 = $sheet->getCell("I{$row}")->getDataValidation();
            $v2->setType(DataValidation::TYPE_LIST)
                ->setErrorStyle(DataValidation::STYLE_STOP)
                ->setAllowBlank(true)->setShowDropDown(true)
                ->setShowErrorMessage(true)
                ->setErrorTitle('Valeur invalide')->setError('Choisir parmi : CDI, CDD, Stagiaire, Vacataire')
                ->setFormula1('"CDI,CDD,Stagiaire,Vacataire"');
        }

        // Largeurs
        $largeurs = ['A' => 15, 'B' => 18, 'C' => 22, 'D' => 12, 'E' => 15, 'F' => 25, 'G' => 28, 'H' => 28, 'I' => 30];
        foreach ($largeurs as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'modele_enseignants.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function import(Request $request)
    {
        $request->validate(['fichier' => 'required|file|mimes:xlsx,xls,csv|max:5120']);

        $path = $request->file('fichier')->getPathname();

        try {
            $spreadsheet = IOFactory::load($path);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Fichier invalide ou illisible.'], 422);
        }

        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);

        $inseres  = 0;
        $erreurs  = [];
        $statutsValides = ['CDI', 'CDD', 'Stagiaire', 'Vacataire'];

        foreach ($rows as $ligne => $row) {
            if ($ligne <= 2) continue; // instructions + en-têtes

            $matricule = trim($row['A'] ?? '');
            $nom       = trim($row['B'] ?? '');
            $prenoms   = trim($row['C'] ?? '');

            // Ligne vide → stop
            if ($matricule === '' && $nom === '' && $prenoms === '') break;

            $ligneErreurs = [];

            if ($matricule === '') $ligneErreurs[] = 'Matricule manquant';
            if ($nom === '')       $ligneErreurs[] = 'Nom manquant';
            if ($prenoms === '')   $ligneErreurs[] = 'Prénoms manquants';

            $genre  = strtoupper(trim($row['D'] ?? ''));
            if ($genre !== '' && !in_array($genre, ['M', 'F'])) {
                $ligneErreurs[] = 'Genre invalide (M ou F attendu)';
            }

            $statut = trim($row['I'] ?? '');
            if ($statut !== '' && !in_array($statut, $statutsValides)) {
                $ligneErreurs[] = 'Statut invalide (' . implode('/', $statutsValides) . ')';
            }

            if (Enseignant::where('matricule_enseignant', $matricule)->exists()) {
                $ligneErreurs[] = "Matricule « {$matricule} » déjà existant";
            }

            if (!empty($ligneErreurs)) {
                $erreurs[] = ['ligne' => $ligne, 'erreurs' => $ligneErreurs];
                continue;
            }

            $dateNaissance = $this->parseDate($row['G'] ?? '');
            $dateEmbauche  = $this->parseDate($row['H'] ?? '');

            $enseignant = Enseignant::create([
                'matricule_enseignant'    => $matricule,
                'nom_enseignant'          => $nom,
                'prenoms_enseignant'      => $prenoms,
                'genre_enseignant'        => $genre ?: null,
                'telephone_enseignant'    => trim($row['E'] ?? '') ?: null,
                'email_enseignant'        => trim($row['F'] ?? '') ?: null,
                'date_naissance_enseignant' => $dateNaissance,
                'date_embauche_enseignant'  => $dateEmbauche,
                'statut_enseignant'       => $statut ?: null,
                'password'                => Hash::make('Enseignant@' . $matricule),
            ]);

            if ($enseignant->telephone_enseignant) {
                CentralUser::lierEnseignant($enseignant, tenant('id'));
            }

            $inseres++;
        }

        return response()->json([
            'inseres' => $inseres,
            'erreurs' => $erreurs,
            'message' => "{$inseres} enseignant(s) importé(s)" . (count($erreurs) ? ', ' . count($erreurs) . ' ligne(s) ignorée(s).' : '.'),
        ]);
    }

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') return null;

        // PhpSpreadsheet renvoie parfois un float (serial date Excel)
        if (is_numeric($value)) {
            try {
                $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $value);
                return $date->format('Y-m-d');
            } catch (\Exception) {
                return null;
            }
        }

        $str = trim((string) $value);
        $parsed = date_create($str);
        return $parsed ? $parsed->format('Y-m-d') : null;
    }
}
