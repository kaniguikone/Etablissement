<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class ExportMoyennesController extends Controller
{
    // Colonnes matières dans l'ordre imposé.
    // Clé = libellé affiché en en-tête Excel, valeur = abbr_matiere de secours (null si aucune).
    // Le lookup tente d'abord libelle_matiere (insensible à la casse), puis abbr_matiere.
    const COLONNES_MATIERES = [
        'Composition Française' => 'CFR',
        'Orthographe'           => null,
        'Oral Français'         => null,
        'Anglais'               => 'ANG',
        'Philosophie'           => 'PHILO',
        'Allemand'              => 'ALL',
        'Espagnol'              => 'ESP',
        'Histoire-Géographie'   => 'HG',
        'Mathématiques'         => 'MATHS',
        'Sciences Physiques'    => 'SPC',
        'SVT'                   => 'SVT',
        'E.P.S'                 => 'EPS',
        'EDHC'                  => 'EDHC',
        'Arts Plastiques'       => 'ARTS',
        'Musique'               => 'MUS',
        'TIC'                   => 'TIC',
        'Conduite'              => 'CDT',
    ];

    public function export(string $niveauId, string $periodeId)
    {
        // ── 1. Données de base ────────────────────────────────────────────────
        $niveau  = DB::table('niveaux')->where('id', $niveauId)->first();
        $periode = DB::table('periodes')->where('id', $periodeId)->first();
        abort_if(!$niveau,  404, 'Niveau introuvable.');
        abort_if(!$periode, 404, 'Période introuvable.');

        // ── 2. Classes du niveau ──────────────────────────────────────────────
        $classes   = DB::table('classes')->where('niveau_id', $niveauId)->get()->keyBy('id');
        $classeIds = $classes->keys()->all();

        // ── 3. Élèves actifs du niveau ────────────────────────────────────────
        $eleves = DB::table('eleves')
            ->whereIn('classe_id', $classeIds)
            ->where('statut_eleve', 'actif')
            ->orderBy('nom_eleve')
            ->orderBy('prenoms_eleve')
            ->get();

        $eleveIds = $eleves->pluck('id')->all();

        // ── 4. Matières de l'établissement ────────────────────────────────────
        $etablissementMatiereIds = array_flip(
            DB::table('etablissement_matieres')->pluck('matiere_id')->all()
        );

        // ── 5. Toutes les matières en DB ──────────────────────────────────────
        $toutesLesMatieres = DB::table('matieres')->get();

        // Trouver chaque colonne fixe dans la DB : d'abord par libelle_matiere, puis par abbr_matiere
        $colonnesMatiereIds = []; // libelle_colonne => matiere_id|null
        foreach (self::COLONNES_MATIERES as $colonne => $abbr) {
            $found = $toutesLesMatieres->first(fn($m) =>
                mb_strtolower(trim($m->libelle_matiere)) === mb_strtolower(trim($colonne))
                || ($abbr !== null && mb_strtolower(trim($m->abbr_matiere)) === mb_strtolower(trim($abbr)))
            );
            $colonnesMatiereIds[$colonne] = $found ? (int)$found->id : null;
        }

        // ── 6. niveau_matieres pour ce niveau (toutes séries) ────────────────
        // Clé : serie_id (ou 'null') => matiere_id => {obligatoire, groupe_alternatif_id}
        $niveauMatieresBySerie = [];
        $rows = DB::table('niveau_matieres')->where('niveau_id', $niveauId)->get();
        foreach ($rows as $nm) {
            $key = $nm->serie_id !== null ? (string)$nm->serie_id : 'null';
            $niveauMatieresBySerie[$key][(int)$nm->matiere_id] = [
                'obligatoire'          => (bool)$nm->obligatoire,
                'groupe_alternatif_id' => $nm->groupe_alternatif_id,
            ];
        }

        // ── 7. classe_matieres pour toutes les classes du niveau ─────────────
        $classeMatieresMap = []; // [classe_id][matiere_id] = true
        if (!empty($classeIds)) {
            $cmRows = DB::table('classe_matieres')->whereIn('classe_id', $classeIds)->get();
            foreach ($cmRows as $cm) {
                $classeMatieresMap[(int)$cm->classe_id][(int)$cm->matiere_id] = true;
            }
        }

        // ── 8. Notes pour la période, pour tous les élèves du niveau ─────────
        // Index : [eleve_id][matiere_id] => [{note, coeff}]
        $notesMap = [];
        if (!empty($eleveIds)) {
            $noteRows = DB::table('notes')
                ->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
                ->where('devoirs.periode_id', $periodeId)
                ->where(function ($q) use ($classeIds, $niveauId) {
                    $q->whereIn('devoirs.classe_id', $classeIds)
                      ->orWhere('devoirs.niveau_id', $niveauId);
                })
                ->whereIn('notes.eleve_id', $eleveIds)
                ->select('notes.eleve_id', 'devoirs.matiere_id', 'notes.note', 'devoirs.coeff_devoir')
                ->get();

            foreach ($noteRows as $n) {
                $notesMap[(int)$n->eleve_id][(int)$n->matiere_id][] = [
                    'note'  => (float)$n->note,
                    'coeff' => (float)$n->coeff_devoir,
                ];
            }
        }

        // ── 9. Séries ─────────────────────────────────────────────────────────
        $series = DB::table('series')->get()->keyBy('id');

        // Code niveau normalisé (6EME, TLE, etc.) — utilisé colonne D + nom fichier
        $abbrNiveau = mb_strtoupper($niveau->abbr_niveau ?? $niveau->nom_niveau, 'UTF-8');
        $abbrNiveau = str_replace(
            ['È','É','Ê','Ë','À','Â','Î','Ï','Ô','Ù','Û','Ü','Ç'],
            ['E','E','E','E','A','A','I','I','O','U','U','U','C'],
            $abbrNiveau
        );
        $abbrNiveau = str_replace('IEME', 'EME', $abbrNiveau);

        // ── 10. Construction du fichier Excel ─────────────────────────────────
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Notes');

        $colonnesEntete = array_merge(
            ['Matricule', 'Nom', 'Série', 'Niveau'],
            array_keys(self::COLONNES_MATIERES)
        );
        $nbColonnes = count($colonnesEntete);

        // En-tête
        foreach ($colonnesEntete as $i => $col) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($i + 1) . '1', $col);
        }

        $lastColLetter = Coordinate::stringFromColumnIndex($nbColonnes);
        $sheet->getStyle("A1:{$lastColLetter}1")->applyFromArray([
            'font' => [
                'bold'  => true,
                'color' => ['argb' => 'FFFFFFFF'],
                'size'  => 10,
            ],
            'fill' => [
                'fillType'   => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF1e3a8a'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical'   => Alignment::VERTICAL_CENTER,
                'wrapText'   => true,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(36);

        // Lignes élèves
        $rowNum = 2;
        foreach ($eleves as $eleve) {
            $classe  = $classes[(int)$eleve->classe_id] ?? null;
            $serieId = $classe ? ($classe->serie_id !== null ? (int)$classe->serie_id : null) : null;
            $serie   = $serieId !== null ? ($series[$serieId] ?? null) : null;

            $sheet->setCellValue("A{$rowNum}", $eleve->matricule_eleve);
            $sheet->setCellValue("B{$rowNum}", $eleve->nom_eleve . ' ' . $eleve->prenoms_eleve);
            $sheet->setCellValue("C{$rowNum}", $serie ? $serie->nom : '');
            $sheet->setCellValue("D{$rowNum}", $abbrNiveau);

            $colIdx = 5; // 1-based, colonne E
            foreach (array_keys(self::COLONNES_MATIERES) as $colonne) {
                $matiereId = $colonnesMatiereIds[$colonne];
                $valeur    = $this->calculerCellule(
                    $matiereId,
                    $serieId,
                    (int)$eleve->classe_id,
                    (int)$eleve->id,
                    $etablissementMatiereIds,
                    $niveauMatieresBySerie,
                    $classeMatieresMap,
                    $notesMap
                );

                $cellRef = Coordinate::stringFromColumnIndex($colIdx) . $rowNum;
                $sheet->setCellValue($cellRef, $valeur);

                // Mise en forme des codes spéciaux
                if ($valeur === 21 || $valeur === 22) {
                    $bgColor   = $valeur === 22 ? 'FFe2e8f0' : 'FFfef9c3';
                    $fontColor = $valeur === 22 ? 'FF94a3b8' : 'FF92400e';
                    $sheet->getStyle($cellRef)->applyFromArray([
                        'fill' => [
                            'fillType'   => Fill::FILL_SOLID,
                            'startColor' => ['argb' => $bgColor],
                        ],
                        'font'      => ['color' => ['argb' => $fontColor]],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    ]);
                } else {
                    // Nombre formaté, centré
                    $sheet->getStyle($cellRef)->getAlignment()
                          ->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle($cellRef)->getNumberFormat()
                          ->setFormatCode('0.00');
                }

                $colIdx++;
            }

            // Alterner les couleurs de ligne
            if ($rowNum % 2 === 0) {
                $sheet->getStyle("A{$rowNum}:{$lastColLetter}{$rowNum}")->applyFromArray([
                    'fill' => [
                        'fillType'   => Fill::FILL_SOLID,
                        'startColor' => ['argb' => 'FFf8fafc'],
                    ],
                ]);
            }

            $rowNum++;
        }

        // Largeurs de colonnes
        $sheet->getColumnDimension('A')->setWidth(16);  // Matricule
        $sheet->getColumnDimension('B')->setWidth(30);  // Nom
        $sheet->getColumnDimension('C')->setWidth(8);   // Série
        $sheet->getColumnDimension('D')->setWidth(14);  // Niveau
        for ($c = 5; $c <= $nbColonnes; $c++) {
            $sheet->getColumnDimensionByColumn($c)->setWidth(16);
        }

        $sheet->freezePane('E2'); // Figer jusqu'à Niveau inclus

        // Nom du fichier : ACTU_MOYENNE {ordinal} Trimestre {Niveau}.xlsx
        $ordinals = ['T1' => '1er', 'T2' => '2e', 'T3' => '3e'];
        $code     = strtoupper(trim($periode->code_periode ?? ''));
        $ordinal  = $ordinals[$code] ?? preg_replace('/[^0-9]/', '', $code);

        $nomFichier = sprintf(
            'ACTU_MOYENNE %s Trimestre %s.xlsx',
            $ordinal,
            $abbrNiveau
        );

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $nomFichier, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    /**
     * Retourne 22 (non enseignée), 21 (pas de notes), ou la moyenne pondérée.
     */
    private function calculerCellule(
        ?int  $matiereId,
        ?int  $serieId,
        int   $classeId,
        int   $eleveId,
        array $etablissementMatiereIds,
        array $niveauMatieresBySerie,
        array $classeMatieresMap,
        array $notesMap
    ): int|float {
        // Matière inconnue en DB
        if ($matiereId === null) return 22;

        // Non enseignée dans l'établissement
        if (!isset($etablissementMatiereIds[$matiereId])) return 22;

        // Vérifier niveau_matieres : tronc commun puis série de l'élève
        $niveauInfo = null;
        $troncKey   = 'null';
        $serieKey   = $serieId !== null ? (string)$serieId : 'null';

        if (isset($niveauMatieresBySerie[$troncKey][$matiereId])) {
            $niveauInfo = $niveauMatieresBySerie[$troncKey][$matiereId];
        } elseif ($serieKey !== 'null' && isset($niveauMatieresBySerie[$serieKey][$matiereId])) {
            $niveauInfo = $niveauMatieresBySerie[$serieKey][$matiereId];
        }

        if ($niveauInfo === null) return 22;

        // Si matière optionnelle → vérifier la résolution par classe
        if (!$niveauInfo['obligatoire'] && $niveauInfo['groupe_alternatif_id'] !== null) {
            if (!isset($classeMatieresMap[$classeId][$matiereId])) return 22;
        }

        // Matière enseignée → chercher les notes de l'élève
        $notesEleve = $notesMap[$eleveId][$matiereId] ?? [];
        if (empty($notesEleve)) return 21;

        // Moyenne pondérée
        $totalCoeff = 0.0;
        $sommePond  = 0.0;
        foreach ($notesEleve as $n) {
            $totalCoeff += $n['coeff'];
            $sommePond  += $n['note'] * $n['coeff'];
        }

        return $totalCoeff > 0 ? round($sommePond / $totalCoeff, 2) : 21;
    }
}
