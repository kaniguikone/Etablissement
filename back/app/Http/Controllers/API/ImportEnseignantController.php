<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CentralUser;
use App\Models\Enseignant;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ImportEnseignantController extends Controller
{
    private const MATRICULE_EXEMPLE = 'ENS001';

    private array $colonnes = [
        'A' => 'Matricule *',
        'B' => 'Nom *',
        'C' => 'Prénoms *',
        'D' => 'Genre',
        'E' => 'Téléphone',
        'F' => 'Email',
        'G' => 'Date de naissance (JJ/MM/AAAA)',
        'H' => 'Date d\'embauche (JJ/MM/AAAA)',
        'I' => 'Statut',
        'J' => 'Créer accès portail (O/N)',
    ];

    public function template()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Enseignants');

        // Ligne 1 : instructions (sautée à l'import)
        $sheet->setCellValue('A1', '* Champs obligatoires. Ne pas modifier les en-têtes (ligne 2). Supprimer la ligne d\'exemple (ligne 3) avant import. Créer accès portail : O pour générer un accès au portail enseignant (mot de passe aléatoire, communiqué séparément), N ou vide pour ne pas créer de compte (nécessite un téléphone renseigné).');
        $sheet->mergeCells('A1:J1');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '856404']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fff3cd']],
        ]);

        // Ligne 2 : en-têtes
        foreach ($this->colonnes as $col => $label) {
            $sheet->setCellValue("{$col}2", $label);
        }
        $sheet->getStyle('A2:J2')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Ligne 3 : exemple
        $exemples = [self::MATRICULE_EXEMPLE, 'KONE', 'Abou', 'M', '0701020304', 'abou@ecole.ci', '15/03/1985', '01/09/2020', 'CDI', 'N'];
        foreach (array_values($exemples) as $i => $valeur) {
            $col = chr(65 + $i);
            $sheet->setCellValue("{$col}3", $valeur);
        }
        $sheet->getStyle('A3:J3')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'e8f0fe']],
        ]);

        // Dropdowns Genre (D), Statut (I), Créer accès (J) — appliqués sur toute la plage 3:1001 en une seule règle
        $dropdowns = [
            'D' => ['"M,F"', 'Valeur invalide', 'Choisir M ou F'],
            'I' => ['"CDI,CDD,Stagiaire,Vacataire"', 'Valeur invalide', 'Choisir parmi : CDI, CDD, Stagiaire, Vacataire'],
            'J' => ['"O,N"', 'Valeur invalide', 'Choisir O ou N'],
        ];
        foreach ($dropdowns as $col => [$formula, $errTitle, $errMsg]) {
            $validation = new DataValidation();
            $validation->setType(DataValidation::TYPE_LIST)
                ->setErrorStyle(DataValidation::STYLE_STOP)
                ->setAllowBlank(true)->setShowDropDown(true)
                ->setShowErrorMessage(true)
                ->setErrorTitle($errTitle)->setError($errMsg)
                ->setFormula1($formula);
            $sheet->setDataValidation("{$col}3:{$col}1001", $validation);
        }

        // Largeurs
        $largeurs = ['A' => 15, 'B' => 18, 'C' => 22, 'D' => 12, 'E' => 15, 'F' => 25, 'G' => 28, 'H' => 28, 'I' => 30, 'J' => 22];
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

            // Ligne vide → ignorée, on continue avec les lignes suivantes
            if ($matricule === '' && $nom === '' && $prenoms === '') continue;

            // Ligne d'exemple du template non supprimée par l'utilisateur
            if ($matricule === self::MATRICULE_EXEMPLE) continue;

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

            $telephone   = trim($row['E'] ?? '') ?: null;
            $creerAcces  = strtoupper(trim($row['J'] ?? '')) === 'O';
            if ($creerAcces && !$telephone) {
                $ligneErreurs[] = 'Téléphone requis pour créer un accès portail';
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
                'telephone_enseignant'    => $telephone,
                'email_enseignant'        => trim($row['F'] ?? '') ?: null,
                'date_naissance_enseignant' => $dateNaissance,
                'date_embauche_enseignant'  => $dateEmbauche,
                'statut_enseignant'       => $statut ?: null,
                'password'                => $creerAcces ? Str::password(16) : null,
            ]);

            if ($creerAcces) {
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

        if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/', $str, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }

        return null;
    }
}
