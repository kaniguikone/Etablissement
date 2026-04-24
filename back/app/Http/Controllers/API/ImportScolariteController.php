<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Niveau;
use App\Models\Scolarites;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ImportScolariteController extends Controller
{
    private array $colonnes = [
        'A' => 'Libellé échéance *',
        'B' => 'Date échéance * (AAAA-MM-JJ)',
        'C' => 'Montant *',
        'D' => 'Niveau * (nom exact)',
    ];

    public function template()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Scolarités');

        // Ligne 1 : instructions (sautée à l'import)
        $sheet->setCellValue('A1', '* Champs obligatoires. Ne pas modifier les en-têtes (ligne 2). Supprimer la ligne d\'exemple (ligne 3) avant import. Le niveau doit correspondre exactement à un nom de niveau existant (voir feuille "Niveaux disponibles").');
        $sheet->mergeCells('A1:D1');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '856404']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fff3cd']],
        ]);

        // Ligne 2 : en-têtes
        foreach ($this->colonnes as $col => $label) {
            $sheet->setCellValue("{$col}2", $label);
        }
        $sheet->getStyle('A2:D2')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Ligne 3 : exemple
        $sheet->setCellValue('A3', '1ère tranche');
        $sheet->setCellValue('B3', '2025-10-01');
        $sheet->setCellValue('C3', '150000');
        $sheet->setCellValue('D3', '6ème');
        $sheet->getStyle('A3:D3')->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'e8f0fe']],
        ]);

        // Niveaux disponibles en feuille 2
        $niveaux = Niveau::orderBy('nom_niveau')->pluck('nom_niveau')->toArray();
        if (!empty($niveaux)) {
            $sheet2 = $spreadsheet->createSheet();
            $sheet2->setTitle('Niveaux disponibles');
            $sheet2->setCellValue('A1', 'Niveaux (utiliser le nom exact dans la colonne D)');
            $sheet2->getStyle('A1')->getFont()->setBold(true);
            foreach ($niveaux as $i => $nom) {
                $sheet2->setCellValue('A' . ($i + 2), $nom);
            }
            $sheet2->getColumnDimension('A')->setWidth(40);
        }

        // Largeurs feuille principale
        $sheet->getColumnDimension('A')->setWidth(25);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension('C')->setWidth(15);
        $sheet->getColumnDimension('D')->setWidth(25);

        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'modele_scolarites.xlsx', [
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

        // Cache des niveaux (nom → id)
        $niveauxMap = Niveau::pluck('id', 'nom_niveau')->toArray();

        $inseres = 0;
        $erreurs = [];

        foreach ($rows as $ligne => $row) {
            if ($ligne <= 2) continue; // instructions + en-têtes

            $libelle  = trim($row['A'] ?? '');
            $date     = trim($row['B'] ?? '');
            $montant  = trim($row['C'] ?? '');
            $niveauNom = trim($row['D'] ?? '');

            if ($libelle === '' && $date === '' && $montant === '' && $niveauNom === '') break;

            $ligneErreurs = [];

            if ($libelle === '')   $ligneErreurs[] = 'Libellé manquant';
            if ($date === '')      $ligneErreurs[] = 'Date manquante';
            if ($montant === '')   $ligneErreurs[] = 'Montant manquant';
            if ($niveauNom === '') $ligneErreurs[] = 'Niveau manquant';

            // Résolution du niveau
            $niveauId = null;
            if ($niveauNom !== '') {
                $niveauId = $niveauxMap[$niveauNom] ?? null;
                if ($niveauId === null) {
                    $ligneErreurs[] = "Niveau « {$niveauNom} » introuvable";
                }
            }

            // Validation date
            $dateParsed = null;
            if ($date !== '') {
                if (is_numeric($date)) {
                    try {
                        $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $date);
                        $dateParsed = $dt->format('Y-m-d');
                    } catch (\Exception) {
                        $ligneErreurs[] = 'Date invalide';
                    }
                } else {
                    $dt = date_create($date);
                    if (!$dt) {
                        $ligneErreurs[] = 'Date invalide (format attendu : AAAA-MM-JJ)';
                    } else {
                        $dateParsed = $dt->format('Y-m-d');
                    }
                }
            }

            if (!empty($ligneErreurs)) {
                $erreurs[] = ['ligne' => $ligne, 'erreurs' => $ligneErreurs];
                continue;
            }

            Scolarites::create([
                'libelle_echeance' => $libelle,
                'date_echeance'    => $dateParsed,
                'montant_echeance' => $montant,
                'niveau_id'        => $niveauId,
            ]);

            $inseres++;
        }

        return response()->json([
            'inseres' => $inseres,
            'erreurs' => $erreurs,
            'message' => "{$inseres} scolarité(s) importée(s)" . (count($erreurs) ? ', ' . count($erreurs) . ' ligne(s) ignorée(s).' : '.'),
        ]);
    }
}
