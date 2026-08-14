<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\Eleve;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ImportEleveController extends Controller
{
    private const MATRICULE_EXEMPLE = 'EL001';

    private const HANDICAPS_VALIDES = [
        'moteur', 'malvoyant', 'malentendant', 'albinisme', 'nanisme', 'begayement', 'autiste',
    ];

    private array $colonnes = [
        'A' => 'Matricule *',
        'B' => 'Nom *',
        'C' => 'Prénoms *',
        'D' => 'Genre',
        'E' => 'Date de naissance (JJ/MM/AAAA) *',
        'F' => 'Lieu de naissance',
        'G' => 'Nationalité',
        'H' => 'Adresse',
        'I' => 'Classe (abréviation) *',
        'J' => 'Langue 2',
        'K' => 'Statut bourse',
        'L' => 'Affecté (O/N)',
        'M' => 'Handicap(s)',
        'N' => 'Statut orphelin',
    ];

    public function template()
    {
        $spreadsheet = new Spreadsheet();

        // --- Feuille principale ---
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Élèves');

        // Ligne 1 : instructions
        $sheet->setCellValue('A1', '* Champs obligatoires. Ne pas modifier les en-têtes (ligne 2). Supprimer la ligne d\'exemple (ligne 3) avant import. Dates au format JJ/MM/AAAA. Classe = abréviation (voir feuille Références). Statut bourse : non_boursier, demi_boursier ou boursier (ignoré si Affecté = N). Affecté : O ou N. Handicap(s) : valeurs séparées par une virgule (' . implode(', ', self::HANDICAPS_VALIDES) . '). Statut orphelin : pere, mere ou les_deux.');
        $sheet->mergeCells('A1:N1');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '856404']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fff3cd']],
        ]);

        // Ligne 2 : en-têtes
        foreach ($this->colonnes as $col => $label) {
            $sheet->setCellValue("{$col}2", $label);
        }
        $sheet->getStyle('A2:N2')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Ligne 3 : exemple
        $exemples = ['EL001', 'KONE', 'Aminata', 'F', '20/05/2010', 'Abidjan', 'Ivoirienne', 'Cocody', '6eA', 'espagnol', 'non_boursier', 'O', '', ''];
        foreach (array_values($exemples) as $i => $valeur) {
            $col = chr(65 + $i);
            $sheet->setCellValue("{$col}3", $valeur);
        }
        $sheet->getStyle('A3:N3')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'e8f0fe']],
        ]);

        // Dropdowns (lignes 3 à 1001)
        $dropdowns = [
            'D' => ['"M,F"',                       'Valeur invalide', 'Choisir M ou F'],
            'J' => ['"espagnol,allemand,autre"',    'Valeur invalide', 'espagnol, allemand ou autre'],
            'K' => ['"non_boursier,demi_boursier,boursier"', 'Valeur invalide', 'non_boursier, demi_boursier ou boursier'],
            'L' => ['"O,N"',                        'Valeur invalide', 'O (oui) ou N (non)'],
            'N' => ['"pere,mere,les_deux"',         'Valeur invalide', 'pere, mere ou les_deux'],
        ];

        foreach ($dropdowns as $col => [$formula, $errTitle, $errMsg]) {
            foreach (range(3, 1001) as $row) {
                $v = $sheet->getCell("{$col}{$row}")->getDataValidation();
                $v->setType(DataValidation::TYPE_LIST)
                    ->setErrorStyle(DataValidation::STYLE_STOP)
                    ->setAllowBlank(true)->setShowDropDown(true)
                    ->setShowErrorMessage(true)
                    ->setErrorTitle($errTitle)->setError($errMsg)
                    ->setFormula1($formula);
            }
        }

        // Largeurs
        $largeurs = [
            'A' => 15, 'B' => 18, 'C' => 22, 'D' => 10, 'E' => 28,
            'F' => 20, 'G' => 18, 'H' => 22, 'I' => 18,
            'J' => 14, 'K' => 18, 'L' => 14, 'M' => 30, 'N' => 18,
        ];
        foreach ($largeurs as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // --- Feuille Références ---
        $ref = $spreadsheet->createSheet();
        $ref->setTitle('Références');

        // Classes
        $ref->setCellValue('A1', 'Abréviation');
        $ref->setCellValue('B1', 'Nom de la classe');
        $ref->getStyle('A1:B1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $classes = Classe::orderBy('abbr_classe')->get(['abbr_classe', 'nom_classe']);
        foreach ($classes as $i => $classe) {
            $row = $i + 2;
            $ref->setCellValue("A{$row}", $classe->abbr_classe);
            $ref->setCellValue("B{$row}", $classe->nom_classe);
        }
        $ref->getColumnDimension('A')->setWidth(16);
        $ref->getColumnDimension('B')->setWidth(26);

        // Valeurs Handicap(s)
        $ref->setCellValue('D1', 'Valeurs Handicap(s)');
        $ref->getStyle('D1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        foreach (self::HANDICAPS_VALIDES as $i => $h) {
            $ref->setCellValue("D" . ($i + 2), $h);
        }
        $ref->getColumnDimension('D')->setWidth(20);

        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'modele_eleves.xlsx', [
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

        $classesMap = Classe::pluck('id', 'abbr_classe')->all();

        $inseres = 0;
        $erreurs = [];

        foreach ($rows as $ligne => $row) {
            if ($ligne <= 2) continue;

            $matricule = trim($row['A'] ?? '');
            $nom       = trim($row['B'] ?? '');
            $prenoms   = trim($row['C'] ?? '');

            if ($matricule === '' && $nom === '' && $prenoms === '') continue;

            if ($matricule === self::MATRICULE_EXEMPLE) continue;

            $ligneErreurs = [];

            if ($matricule === '') $ligneErreurs[] = 'Matricule manquant';
            if ($nom === '')       $ligneErreurs[] = 'Nom manquant';
            if ($prenoms === '')   $ligneErreurs[] = 'Prénoms manquants';

            $dateNaissance = $this->parseDate($row['E'] ?? '');
            if ($dateNaissance === null) $ligneErreurs[] = 'Date de naissance manquante ou invalide (format JJ/MM/AAAA attendu)';

            $genre = strtoupper(trim($row['D'] ?? ''));
            if ($genre !== '' && !in_array($genre, ['M', 'F'])) {
                $ligneErreurs[] = 'Genre invalide (M ou F attendu)';
            }

            $abbrClasse = trim($row['I'] ?? '');
            if ($abbrClasse === '') {
                $ligneErreurs[] = 'Classe manquante';
            } elseif (!isset($classesMap[$abbrClasse])) {
                $ligneErreurs[] = "Classe « {$abbrClasse} » introuvable";
            }

            if ($matricule !== '' && Eleve::where('matricule_eleve', $matricule)->exists()) {
                $ligneErreurs[] = "Matricule « {$matricule} » déjà existant";
            }

            // Langue 2 (J)
            $langue2Raw = strtolower(trim($row['J'] ?? ''));
            $langue2 = in_array($langue2Raw, ['espagnol', 'allemand', 'autre']) ? $langue2Raw : null;

            // Statut bourse (K) et affecté (L)
            $estAffecte      = strtoupper(trim($row['L'] ?? '')) === 'O';
            $statutBourseRaw = strtolower(trim($row['K'] ?? ''));
            $statutBourse    = $estAffecte && in_array($statutBourseRaw, ['demi_boursier', 'boursier'])
                ? $statutBourseRaw
                : 'non_boursier';

            // Handicap(s) (M) — valeurs séparées par virgule
            $handicapsRaw = trim($row['M'] ?? '');
            $typesHandicap = null;
            if ($handicapsRaw !== '') {
                $valeurs   = array_values(array_filter(array_map('trim', explode(',', $handicapsRaw))));
                $invalides = array_diff($valeurs, self::HANDICAPS_VALIDES);
                if (!empty($invalides)) {
                    $ligneErreurs[] = 'Handicap(s) invalide(s) : ' . implode(', ', $invalides)
                        . ' (valeurs autorisées : ' . implode(', ', self::HANDICAPS_VALIDES) . ')';
                } else {
                    $typesHandicap = $valeurs;
                }
            }

            // Statut orphelin (N)
            $orphelinRaw = strtolower(trim($row['N'] ?? ''));
            $orphelinMap = ['pere' => 'pere', 'père' => 'pere', 'mere' => 'mere', 'mère' => 'mere', 'les_deux' => 'les_deux', 'les deux' => 'les_deux'];
            $statutOrphelin = $orphelinMap[$orphelinRaw] ?? null;

            if (!empty($ligneErreurs)) {
                $erreurs[] = ['ligne' => $ligne, 'erreurs' => $ligneErreurs];
                continue;
            }

            Eleve::create([
                'matricule_eleve'      => $matricule,
                'nom_eleve'            => $nom,
                'prenoms_eleve'        => $prenoms,
                'genre_eleve'          => $genre ?: null,
                'date_naissance_eleve' => $dateNaissance,
                'lieu_naissance_eleve' => trim($row['F'] ?? '') ?: null,
                'nationalite_eleve'    => trim($row['G'] ?? '') ?: null,
                'adresse_eleve'        => trim($row['H'] ?? '') ?: null,
                'classe_id'            => $classesMap[$abbrClasse],
                'statut_eleve'         => 'actif',
                'langue2'              => $langue2,
                'statut_bourse'        => $statutBourse,
                'est_affecte'          => $estAffecte,
                'types_handicap'       => $typesHandicap,
                'statut_orphelin'      => $statutOrphelin,
            ]);

            $inseres++;
        }

        return response()->json([
            'inseres' => $inseres,
            'erreurs' => $erreurs,
            'message' => "{$inseres} élève(s) importé(s)" . (count($erreurs) ? ', ' . count($erreurs) . ' ligne(s) ignorée(s).' : '.'),
        ]);
    }

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') return null;

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

        $parsed = date_create($str);
        return $parsed ? $parsed->format('Y-m-d') : null;
    }
}
