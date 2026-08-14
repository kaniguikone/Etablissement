<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\Enseignant;
use App\Models\Matiere;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ImportAffectationController extends Controller
{
    public function template()
    {
        $spreadsheet = new Spreadsheet();

        // ── Feuille 2 : Références ────────────────────────────────────────────
        $refSheet = $spreadsheet->createSheet();
        $refSheet->setTitle('Références');

        $enseignants = Enseignant::orderBy('nom_enseignant')
            ->get(['matricule_enseignant', 'nom_enseignant', 'prenoms_enseignant']);
        $classes  = Classe::orderBy('abbr_classe')->get(['abbr_classe', 'nom_classe']);
        $matieres = Matiere::orderBy('abbr_matiere')->get(['abbr_matiere', 'libelle_matiere']);

        // En-têtes références
        foreach (['A' => 'Matricule enseignant', 'B' => 'Nom enseignant', 'C' => 'Abbr classe', 'D' => 'Nom classe', 'E' => 'Abbr matière', 'F' => 'Libellé matière'] as $col => $label) {
            $refSheet->setCellValue("{$col}1", $label);
        }
        $refSheet->getStyle('A1:F1')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'dadce0']],
        ]);

        foreach ($enseignants as $i => $e) {
            $row = $i + 2;
            $refSheet->setCellValue("A{$row}", $e->matricule_enseignant);
            $refSheet->setCellValue("B{$row}", $e->nom_enseignant . ' ' . $e->prenoms_enseignant);
        }
        foreach ($classes as $i => $c) {
            $row = $i + 2;
            $refSheet->setCellValue("C{$row}", $c->abbr_classe);
            $refSheet->setCellValue("D{$row}", $c->nom_classe);
        }
        foreach ($matieres as $i => $m) {
            $row = $i + 2;
            $refSheet->setCellValue("E{$row}", $m->abbr_matiere);
            $refSheet->setCellValue("F{$row}", $m->libelle_matiere);
        }
        foreach (['A' => 20, 'B' => 30, 'C' => 15, 'D' => 28, 'E' => 15, 'F' => 28] as $col => $w) {
            $refSheet->getColumnDimension($col)->setWidth($w);
        }

        // Calcul des plages pour les dropdowns
        $nbEnseignants = max($enseignants->count(), 1);
        $nbClasses     = max($classes->count(), 1);
        $nbMatieres    = max($matieres->count(), 1);
        $plageEns  = "Références!\$A\$2:\$A\$" . ($nbEnseignants + 1);
        $plageClasse = "Références!\$C\$2:\$C\$" . ($nbClasses + 1);
        $plageMat  = "Références!\$E\$2:\$E\$" . ($nbMatieres + 1);

        // ── Feuille 1 : Affectations ──────────────────────────────────────────
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Affectations');

        // Ligne 1 : instructions (sautée à l'import)
        $sheet->setCellValue('A1', '* Champs obligatoires. Ne pas modifier les en-têtes (ligne 2). Supprimer la ligne d\'exemple (ligne 3) avant import. Utiliser les abréviations exactes (voir feuille "Références"). Max 3 matières et 7 classes par enseignant.');
        $sheet->mergeCells('A1:C1');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '856404']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fff3cd']],
        ]);

        // Ligne 2 : en-têtes
        $headers = ['A' => 'Matricule enseignant *', 'B' => 'Abbr classe *', 'C' => 'Abbr matière *'];
        foreach ($headers as $col => $label) {
            $sheet->setCellValue("{$col}2", $label);
        }
        $sheet->getStyle('A2:C2')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Ligne 3 : exemple
        if ($enseignants->isNotEmpty() && $classes->isNotEmpty() && $matieres->isNotEmpty()) {
            $sheet->setCellValue('A3', $enseignants->first()->matricule_enseignant);
            $sheet->setCellValue('B3', $classes->first()->abbr_classe);
            $sheet->setCellValue('C3', $matieres->first()->abbr_matiere);
            $sheet->getStyle('A3:C3')->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'e8f0fe']],
            ]);
        }

        // Dropdowns données (lignes 3-1001)
        foreach (range(3, 1001) as $row) {
            foreach (['A' => $plageEns, 'B' => $plageClasse, 'C' => $plageMat] as $col => $plage) {
                $v = $sheet->getCell("{$col}{$row}")->getDataValidation();
                $v->setType(DataValidation::TYPE_LIST)
                    ->setErrorStyle(DataValidation::STYLE_STOP)
                    ->setAllowBlank(true)
                    ->setShowDropDown(true)
                    ->setShowErrorMessage(true)
                    ->setErrorTitle('Valeur invalide')
                    ->setError('Utiliser une valeur de la feuille Références')
                    ->setFormula1($plage);
            }
        }

        foreach (['A' => 25, 'B' => 18, 'C' => 18] as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }

        $spreadsheet->setActiveSheetIndex(0);
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'modele_affectations.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function import(Request $request)
    {
        $request->validate(['fichier' => 'required|file|mimes:xlsx,xls,csv|max:5120']);

        try {
            $spreadsheet = IOFactory::load($request->file('fichier')->getPathname());
        } catch (\Exception) {
            return response()->json(['message' => 'Fichier invalide ou illisible.'], 422);
        }

        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);

        // Cache des résolutions
        $enseignantsMap = Enseignant::pluck('id', 'matricule_enseignant')->toArray();
        $classesMap     = Classe::pluck('id', 'abbr_classe')->toArray();
        $matieresMap    = Matiere::pluck('id', 'abbr_matiere')->toArray();

        // Charge toutes les affectations existantes en mémoire
        $existantes = DB::table('classe_enseignant_matiere')
            ->get(['enseignant_id', 'classe_id', 'matiere_id'])
            ->map(fn($r) => "{$r->enseignant_id}_{$r->classe_id}_{$r->matiere_id}")
            ->flip()
            ->toArray();

        // Groupe les lignes par enseignant pour vérifier les contraintes
        $parEnseignant = []; // enseignant_id => [{classe_id, matiere_id}]
        $lignesValides = [];
        $erreurs       = [];

        foreach ($rows as $ligne => $row) {
            if ($ligne <= 2) continue; // instructions + en-têtes

            $matricule  = trim($row['A'] ?? '');
            $abbrClasse = trim($row['B'] ?? '');
            $abbrMat    = trim($row['C'] ?? '');

            if ($matricule === '' && $abbrClasse === '' && $abbrMat === '') continue;

            $ligneErreurs = [];

            if ($matricule === '')  $ligneErreurs[] = 'Matricule enseignant manquant';
            if ($abbrClasse === '') $ligneErreurs[] = 'Abréviation classe manquante';
            if ($abbrMat === '')    $ligneErreurs[] = 'Abréviation matière manquante';

            $enseignantId = $enseignantsMap[$matricule] ?? null;
            $classeId     = $classesMap[$abbrClasse]    ?? null;
            $matiereId    = $matieresMap[$abbrMat]      ?? null;

            if ($matricule !== '' && $enseignantId === null) $ligneErreurs[] = "Enseignant « {$matricule} » introuvable";
            if ($abbrClasse !== '' && $classeId === null)     $ligneErreurs[] = "Classe « {$abbrClasse} » introuvable";
            if ($abbrMat !== '' && $matiereId === null)       $ligneErreurs[] = "Matière « {$abbrMat} » introuvable";

            if (!empty($ligneErreurs)) {
                $erreurs[] = ['ligne' => $ligne, 'erreurs' => $ligneErreurs];
                continue;
            }

            $cle = "{$enseignantId}_{$classeId}_{$matiereId}";
            if (isset($existantes[$cle])) continue; // déjà en base

            $parEnseignant[$enseignantId][] = ['classe_id' => $classeId, 'matiere_id' => $matiereId, 'ligne' => $ligne];
            $lignesValides[$ligne]          = ['enseignant_id' => $enseignantId, 'classe_id' => $classeId, 'matiere_id' => $matiereId, 'cle' => $cle];
        }

        // Vérification des contraintes par enseignant (existant + nouvelles)
        $aInserer  = [];
        $dejaCles  = array_flip(array_keys($existantes));

        foreach ($parEnseignant as $enseignantId => $nouvelles) {
            $existantesEns = DB::table('classe_enseignant_matiere')
                ->where('enseignant_id', $enseignantId)
                ->get(['classe_id', 'matiere_id']);

            $classesIds  = $existantesEns->pluck('classe_id')->toArray();
            $matieresIds = $existantesEns->pluck('matiere_id')->toArray();

            foreach ($nouvelles as $n) {
                $classesFuturs  = array_unique(array_merge($classesIds, [$n['classe_id']]));
                $matieresFuturs = array_unique(array_merge($matieresIds, [$n['matiere_id']]));

                if (count($matieresFuturs) > 3) {
                    $erreurs[] = ['ligne' => $n['ligne'], 'erreurs' => ['Dépasse la limite de 3 matières pour cet enseignant']];
                    continue;
                }
                if (count($classesFuturs) > 7) {
                    $erreurs[] = ['ligne' => $n['ligne'], 'erreurs' => ['Dépasse la limite de 7 classes pour cet enseignant']];
                    continue;
                }

                $classesIds  = $classesFuturs;
                $matieresIds = $matieresFuturs;
                $aInserer[]  = ['enseignant_id' => $enseignantId, 'classe_id' => $n['classe_id'], 'matiere_id' => $n['matiere_id']];
            }
        }

        foreach ($aInserer as $row) {
            DB::table('classe_enseignant_matiere')->insert($row);
        }

        $inseres = count($aInserer);

        return response()->json([
            'inseres' => $inseres,
            'erreurs' => $erreurs,
            'message' => "{$inseres} affectation(s) ajoutée(s)" . (count($erreurs) ? ', ' . count($erreurs) . ' ligne(s) ignorée(s).' : '.'),
        ]);
    }
}
