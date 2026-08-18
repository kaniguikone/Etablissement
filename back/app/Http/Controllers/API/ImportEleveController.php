<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\Eleve;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ImportEleveController extends Controller
{
    private const MATRICULE_EXEMPLE = 'EL001';

    /** Type de handicap => libellé affiché en en-tête de colonne. Chaque type a sa propre colonne O/N. */
    private const HANDICAPS = [
        'moteur'       => 'Moteur',
        'malvoyant'    => 'Malvoyant',
        'malentendant' => 'Malentendant',
        'albinisme'    => 'Albinisme',
        'nanisme'      => 'Nanisme',
        'begayement'   => 'Bégaiement',
        'autiste'      => 'Autiste',
    ];

    /** Colonne (1-based, A=1) où démarrent les colonnes Handicap. */
    private const HANDICAPS_COL_DEBUT = 13; // M

    /** Libellés des colonnes fixes (avant les colonnes Handicap), dans l'ordre A, B, C… */
    private const COLONNES_FIXES = [
        'Matricule *',
        'Nom *',
        'Prénoms *',
        'Genre',
        'Date de naissance (JJ/MM/AAAA) *',
        'Lieu de naissance',
        'Nationalité',
        'Adresse',
        'Classe (abréviation) *',
        'Langue 2',
        'Statut bourse',
        'Affecté (O/N)',
    ];

    /** [type_handicap => lettre de colonne], ex: ['moteur' => 'M', 'malvoyant' => 'N', …] */
    private function colonnesHandicap(): array
    {
        $colonnes = [];
        $index = self::HANDICAPS_COL_DEBUT;
        foreach (self::HANDICAPS as $type => $label) {
            $colonnes[$type] = Coordinate::stringFromColumnIndex($index);
            $index++;
        }
        return $colonnes;
    }

    private function colonneOrphelin(): string
    {
        return Coordinate::stringFromColumnIndex(self::HANDICAPS_COL_DEBUT + count(self::HANDICAPS));
    }

    /** [lettre de colonne => libellé] pour toutes les colonnes du modèle, dans l'ordre. */
    private function colonnes(): array
    {
        $colonnes = [];
        foreach (self::COLONNES_FIXES as $i => $label) {
            $colonnes[Coordinate::stringFromColumnIndex($i + 1)] = $label;
        }
        foreach ($this->colonnesHandicap() as $type => $lettre) {
            $colonnes[$lettre] = 'Handicap ' . self::HANDICAPS[$type] . ' (O/N)';
        }
        $colonnes[$this->colonneOrphelin()] = 'Statut orphelin';

        return $colonnes;
    }

    public function template()
    {
        $spreadsheet = new Spreadsheet();
        $colonnes = $this->colonnes();
        $lettres = array_keys($colonnes);
        $derniereColonne = end($lettres);

        // --- Feuille principale ---
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Élèves');

        // Ligne 1 : instructions
        $sheet->setCellValue('A1', '* Champs obligatoires. Ne pas modifier les en-têtes (ligne 2). Supprimer la ligne d\'exemple (ligne 3) avant import. Dates au format JJ/MM/AAAA. Classe = abréviation (voir feuille Références). Statut bourse : non_boursier, demi_boursier ou boursier (ignoré si Affecté = N). Affecté : O ou N. Handicap(s) : mettre O dans la ou les colonnes concernées, N ou vide sinon. Statut orphelin : pere, mere ou les_deux.');
        $sheet->mergeCells("A1:{$derniereColonne}1");
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '856404']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fff3cd']],
        ]);

        // Ligne 2 : en-têtes
        foreach ($colonnes as $col => $label) {
            $sheet->setCellValue("{$col}2", $label);
        }
        $sheet->getStyle("A2:{$derniereColonne}2")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a73e8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'wrapText' => true],
        ]);
        $sheet->getRowDimension(2)->setRowHeight(30);

        // Ligne 3 : exemple
        $exemples = array_merge(
            ['EL001', 'KONE', 'Aminata', 'F', '20/05/2010', 'Abidjan', 'Ivoirienne', 'Cocody', '6eA', 'espagnol', 'non_boursier', 'O'],
            array_fill(0, count(self::HANDICAPS), 'N'),
            ['']
        );
        foreach (array_values($exemples) as $i => $valeur) {
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValue("{$col}3", $valeur);
        }
        $sheet->getStyle("A3:{$derniereColonne}3")->applyFromArray([
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'e8f0fe']],
        ]);

        // Dropdowns (lignes 3 à 1001)
        $dropdowns = [
            'D' => ['"M,F"',                       'Valeur invalide', 'Choisir M ou F'],
            'J' => ['"espagnol,allemand,autre"',    'Valeur invalide', 'espagnol, allemand ou autre'],
            'K' => ['"non_boursier,demi_boursier,boursier"', 'Valeur invalide', 'non_boursier, demi_boursier ou boursier'],
            'L' => ['"O,N"',                        'Valeur invalide', 'O (oui) ou N (non)'],
        ];
        foreach ($this->colonnesHandicap() as $lettre) {
            $dropdowns[$lettre] = ['"O,N"', 'Valeur invalide', 'O (oui) ou N (non)'];
        }
        $dropdowns[$this->colonneOrphelin()] = ['"pere,mere,les_deux"', 'Valeur invalide', 'pere, mere ou les_deux'];

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
        $largeurs = [
            'A' => 15, 'B' => 18, 'C' => 22, 'D' => 10, 'E' => 28,
            'F' => 20, 'G' => 18, 'H' => 22, 'I' => 18,
            'J' => 14, 'K' => 18, 'L' => 14,
        ];
        foreach ($largeurs as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }
        foreach ($this->colonnesHandicap() as $lettre) {
            $sheet->getColumnDimension($lettre)->setWidth(14);
        }
        $sheet->getColumnDimension($this->colonneOrphelin())->setWidth(18);

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
        $colonnesHandicap = $this->colonnesHandicap();
        $colonneOrphelin = $this->colonneOrphelin();

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

            // Handicap(s) — une colonne O/N par type
            $typesHandicap = [];
            foreach ($colonnesHandicap as $type => $col) {
                if (strtoupper(trim($row[$col] ?? '')) === 'O') {
                    $typesHandicap[] = $type;
                }
            }
            $typesHandicap = $typesHandicap ?: null;

            // Statut orphelin
            $orphelinRaw = strtolower(trim($row[$colonneOrphelin] ?? ''));
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
