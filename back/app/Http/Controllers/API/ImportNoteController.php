<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\Devoir;
use App\Models\Eleve;
use App\Models\Note;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ImportNoteController extends Controller
{
    public function template(Request $request, string $devoirId)
    {
        $devoir = Devoir::with(['classe', 'niveau', 'matiere', 'typeDevoir', 'periode'])->findOrFail($devoirId);

        // Résolution de la classe
        $classeId = $devoir->classe_id;
        if (!$classeId) {
            $classeId = $request->query('classe_id');
            if (!$classeId) {
                return response()->json(['message' => 'Ce devoir est lié à un niveau : préciser le paramètre classe_id.'], 422);
            }
        }

        $eleves = Eleve::where('classe_id', $classeId)->orderBy('nom_eleve')->get();
        $notes  = Note::where('devoir_id', $devoirId)->get()->keyBy('eleve_id');
        $classe = $devoir->classe ?? Classe::find($classeId);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Notes');

        // Bloc info devoir (lignes 1-2)
        $infoDevoir = implode(' — ', array_filter([
            $devoir->code_devoir,
            $devoir->matiere?->libelle_matiere,
            $devoir->typeDevoir?->libelle_type_devoir ?? $devoir->typeDevoir?->code_type_devoir,
            $classe?->nom_classe,
            $devoir->periode?->libelle_periode,
            'Coeff : ' . $devoir->coeff_devoir,
        ]));
        // Ligne 1 : infos devoir
        $sheet->setCellValue('A1', $infoDevoir);
        $sheet->mergeCells('A1:E1');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 11],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fce8b2']],
        ]);

        // Ligne 2 : note explicative
        $sheet->setCellValue('A2', 'Ne pas modifier les colonnes A à D. Laisser vide pour effacer une note.');
        $sheet->mergeCells('A2:E2');
        $sheet->getStyle('A2')->getFont()->setItalic(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF888888'));

        // Ligne 3 : en-têtes colonnes
        $headers = ['A' => 'ID élève', 'B' => 'Matricule', 'C' => 'Nom', 'D' => 'Prénoms', 'E' => 'Note (/20)'];
        foreach ($headers as $col => $label) {
            $sheet->setCellValue("{$col}3", $label);
        }
        $sheet->getStyle('A3:E3')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Colonnes A-D : fond gris (ne pas modifier)
        $gris = ['fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'f1f3f4']]];
        $styleNote = ['fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFFFFF']]];

        // Remplissage élèves
        foreach ($eleves as $i => $eleve) {
            $row  = $i + 4;
            $note = $notes->get($eleve->id);

            $sheet->setCellValue("A{$row}", $eleve->id);
            $sheet->setCellValue("B{$row}", $eleve->matricule_eleve);
            $sheet->setCellValue("C{$row}", $eleve->nom_eleve);
            $sheet->setCellValue("D{$row}", $eleve->prenoms_eleve);
            if ($note !== null) {
                $sheet->setCellValue("E{$row}", $note->note);
            }

            $sheet->getStyle("A{$row}:D{$row}")->applyFromArray($gris);
            $sheet->getStyle("E{$row}")->applyFromArray($styleNote);

            // Validation note 0-20
            $v = $sheet->getCell("E{$row}")->getDataValidation();
            $v->setType(DataValidation::TYPE_DECIMAL)
                ->setErrorStyle(DataValidation::STYLE_STOP)
                ->setOperator(DataValidation::OPERATOR_BETWEEN)
                ->setAllowBlank(true)
                ->setShowErrorMessage(true)
                ->setErrorTitle('Note invalide')
                ->setError('La note doit être comprise entre 0 et 20')
                ->setFormula1('0')
                ->setFormula2('20');
        }

        // Largeurs
        $sheet->getColumnDimension('A')->setWidth(10);
        $sheet->getColumnDimension('B')->setWidth(15);
        $sheet->getColumnDimension('C')->setWidth(20);
        $sheet->getColumnDimension('D')->setWidth(25);
        $sheet->getColumnDimension('E')->setWidth(14);

        // Masquer la colonne A (ID élève — utile pour l'import mais pas pour l'utilisateur)
        $sheet->getColumnDimension('A')->setVisible(false);

        $filename = 'notes_' . str_replace(['/', ' ', ':'], '_', $devoir->code_devoir) . '.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function import(Request $request, string $devoirId)
    {
        $request->validate(['fichier' => 'required|file|mimes:xlsx,xls,csv|max:5120']);

        $devoir = Devoir::with(['matiere', 'typeDevoir'])->findOrFail($devoirId);

        // Résolution de la classe
        $classeId = $devoir->classe_id;
        if (!$classeId) {
            $classeId = $request->query('classe_id');
            if (!$classeId) {
                return response()->json(['message' => 'Paramètre classe_id requis pour ce devoir de niveau.'], 422);
            }
        }

        // Map eleve_id → élève (pour validation appartenance classe)
        $elevesClasse = Eleve::where('classe_id', $classeId)
            ->get(['id', 'matricule_eleve', 'nom_eleve', 'prenoms_eleve'])
            ->keyBy('id');

        try {
            $spreadsheet = IOFactory::load($request->file('fichier')->getPathname());
        } catch (\Exception) {
            return response()->json(['message' => 'Fichier invalide ou illisible.'], 422);
        }

        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);

        $notifService = app(NotificationService::class);
        $inseres  = 0;
        $erreurs  = [];

        foreach ($rows as $ligne => $row) {
            if ($ligne <= 3) continue; // en-têtes (lignes 1-3)

            $eleveId  = trim($row['A'] ?? '');
            $noteVal  = $row['E'] ?? null;

            // Ligne entièrement vide → fin
            if ($eleveId === '' && ($noteVal === null || trim((string) $noteVal) === '')) break;

            // Ignorer lignes sans ID (ligne de note explicative en fin de fichier)
            if ($eleveId === '') continue;

            if (!isset($elevesClasse[$eleveId])) {
                $matricule = trim($row['B'] ?? '');
                $erreurs[] = ['ligne' => $ligne, 'erreurs' => ["Élève ID {$eleveId} (matricule « {$matricule} ») n'appartient pas à cette classe"]];
                continue;
            }

            $noteStr = trim((string) ($noteVal ?? ''));

            // Cellule vide → supprimer la note
            if ($noteStr === '') {
                Note::where('devoir_id', $devoirId)->where('eleve_id', $eleveId)->delete();
                $inseres++;
                continue;
            }

            if (!is_numeric($noteStr) || (float) $noteStr < 0 || (float) $noteStr > 20) {
                $erreurs[] = ['ligne' => $ligne, 'erreurs' => ['Note invalide (doit être entre 0 et 20)']];
                continue;
            }

            $noteFloat = (float) $noteStr;
            $existante = Note::where('devoir_id', $devoirId)->where('eleve_id', $eleveId)->first();
            $ancienneNote = $existante?->note;

            Note::updateOrCreate(
                ['devoir_id' => $devoirId, 'eleve_id' => $eleveId],
                ['note' => $noteFloat]
            );

            if ((string) $ancienneNote !== (string) $noteFloat) {
                $eleve = $elevesClasse[$eleveId];
                $eleveAvecParent = Eleve::with('parents')->find($eleveId);
                if ($eleveAvecParent?->parents) {
                    $matiereNom = $devoir->matiere->libelle_matiere;
                    $typeNom    = $devoir->typeDevoir->libelle_type_devoir ?? $devoir->typeDevoir->code_type_devoir;
                    $noteAff    = number_format($noteFloat, 2, ',', '');
                    $action     = $ancienneNote === null ? 'a reçu' : 'a une note modifiée :';
                    $notifService->notifierParent(
                        $eleveAvecParent->parents->id,
                        'note',
                        'Nouvelle note',
                        "{$eleveAvecParent->prenoms_eleve} {$eleveAvecParent->nom_eleve} {$action} {$noteAff}/20 en {$matiereNom} ({$typeNom}).",
                        ['eleve_id' => $eleveId, 'devoir_id' => $devoirId]
                    );
                }
            }

            $inseres++;
        }

        return response()->json([
            'inseres' => $inseres,
            'erreurs' => $erreurs,
            'message' => "{$inseres} note(s) importée(s)" . (count($erreurs) ? ', ' . count($erreurs) . ' ligne(s) ignorée(s).' : '.'),
        ]);
    }
}
