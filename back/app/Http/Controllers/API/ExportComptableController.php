<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Etablissement;
use App\Models\Paiement;
use App\Models\PaiementFraisAnnexe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

/**
 * Export des encaissements au format Excel (3 feuilles) ou CSV FEC (SAGE/OHADA).
 *
 * Comptes OHADA utilisés :
 *   706100 – Droits de scolarité
 *   706200 – Frais annexes
 *   411000 – Clients (élèves)
 *   571000 – Caisse (espèces)
 *   521000 – Banque (chèque / virement)
 *   512000 – Mobile Money / CinetPay
 */
class ExportComptableController extends Controller
{
    // ── Constantes OHADA ────────────────────────────────────────────────────
    const COMPTES = [
        'scolarite_produit' => ['num' => '706100', 'lib' => 'Droits de scolarité'],
        'annexe_produit'    => ['num' => '706200', 'lib' => 'Frais annexes divers'],
        'client'            => ['num' => '411000', 'lib' => 'Clients – Élèves'],
        'caisse'            => ['num' => '571000', 'lib' => 'Caisse'],
        'banque'            => ['num' => '521000', 'lib' => 'Banque'],
        'mobile'            => ['num' => '512000', 'lib' => 'Mobile Money / CinetPay'],
    ];

    const MODE_TRESORERIE = [
        'especes'  => '571000',
        'cheque'   => '521000',
        'virement' => '521000',
        'cinetpay' => '512000',
        'autre'    => '571000',
    ];

    // ── Endpoint principal ──────────────────────────────────────────────────

    public function export(Request $request)
    {
        $request->validate([
            'date_debut' => 'nullable|date',
            'date_fin'   => 'nullable|date',
            'annee'      => 'nullable|string|max:12',
            'format'     => 'nullable|in:excel,fec',
        ]);

        ini_set('memory_limit', '256M');

        $dateDebut = $request->input('date_debut');
        $dateFin   = $request->input('date_fin');
        $annee     = $request->input('annee');
        $format    = $request->input('format', 'excel');

        $lignes = $this->collecterLignes($dateDebut, $dateFin, $annee);

        if ($format === 'fec') {
            return $this->genererFec($lignes, $dateDebut, $dateFin, $annee);
        }

        return $this->genererExcel($lignes, $dateDebut, $dateFin, $annee);
    }

    // ── Résumé (aperçu sans téléchargement) ────────────────────────────────

    public function apercu(Request $request)
    {
        $request->validate([
            'date_debut' => 'nullable|date',
            'date_fin'   => 'nullable|date',
            'annee'      => 'nullable|string|max:12',
        ]);

        $lignes = $this->collecterLignes(
            $request->input('date_debut'),
            $request->input('date_fin'),
            $request->input('annee'),
        );

        $totalScol   = collect($lignes)->where('type', 'scolarite')->sum('montant');
        $totalAnnexe = collect($lignes)->where('type', 'frais_annexe')->sum('montant');
        $parMode     = collect($lignes)->groupBy('mode_paiement')->map(fn ($g) => $g->sum('montant'));

        return response()->json([
            'total_encaisse'     => $totalScol + $totalAnnexe,
            'total_scolarite'    => $totalScol,
            'total_frais_annexes'=> $totalAnnexe,
            'nombre_ecritures'   => count($lignes),
            'par_mode'           => $parMode,
        ]);
    }

    // ── Collecte des données ────────────────────────────────────────────────

    private function collecterLignes(?string $dateDebut, ?string $dateFin, ?string $annee): array
    {
        // ── Paiements de scolarité ───────────────────────────────────────────
        $queryScol = Paiement::with(['eleve.classe.niveau', 'scolarite'])
            ->where(fn ($q) => $q
                ->whereNull('statut_cinetpay')
                ->orWhereNotIn('statut_cinetpay', ['pending', 'cancelled'])
            )
            ->orderBy('date_paiement');

        if ($dateDebut) $queryScol->whereDate('date_paiement', '>=', $dateDebut);
        if ($dateFin)   $queryScol->whereDate('date_paiement', '<=', $dateFin);
        if ($annee) {
            $queryScol->whereHas('scolarite.niveau', function ($q) use ($annee) {
                // L'année scolaire n'est pas directement sur Paiement — on filtre par date si dispo
            });
            // Fallback : filtre sur l'année de la date si annee est de la forme "YYYY-YYYY"
            if (preg_match('/^(\d{4})-(\d{4})$/', $annee, $m)) {
                $queryScol->whereRaw("YEAR(date_paiement) IN (?, ?)", [(int)$m[1], (int)$m[2]]);
            }
        }

        $lignes = [];
        foreach ($queryScol->get() as $p) {
            $lignes[] = [
                'type'          => 'scolarite',
                'date'          => $p->date_paiement->format('Y-m-d'),
                'reference'     => sprintf('SCO-%06d', $p->id),
                'libelle'       => $p->scolarite?->libelle_echeance ?? 'Scolarité',
                'eleve'         => $this->nomEleve($p->eleve),
                'classe'        => $p->eleve?->classe?->abbr_classe ?? '',
                'montant'       => (float) $p->montant_paye,
                'mode_paiement' => $p->mode_paiement ?? 'especes',
                'reference_op'  => $p->reference_paiement ?? '',
                'compte_produit'=> self::COMPTES['scolarite_produit'],
                'compte_tresor' => $this->compteTresorerie($p->mode_paiement ?? 'especes'),
            ];
        }

        // ── Paiements de frais annexes ───────────────────────────────────────
        $queryAnnexe = PaiementFraisAnnexe::with(['eleve.classe', 'fraisAnnexe'])
            ->orderBy('date_paiement');

        if ($dateDebut) $queryAnnexe->whereDate('date_paiement', '>=', $dateDebut);
        if ($dateFin)   $queryAnnexe->whereDate('date_paiement', '<=', $dateFin);
        if ($annee) {
            $queryAnnexe->whereHas('fraisAnnexe', fn ($q) => $q->where('annee', $annee));
        }

        foreach ($queryAnnexe->get() as $p) {
            $lignes[] = [
                'type'          => 'frais_annexe',
                'date'          => $p->date_paiement->format('Y-m-d'),
                'reference'     => sprintf('FRA-%06d', $p->id),
                'libelle'       => $p->fraisAnnexe?->nom ?? 'Frais annexe',
                'eleve'         => $this->nomEleve($p->eleve),
                'classe'        => $p->eleve?->classe?->abbr_classe ?? '',
                'montant'       => (float) $p->montant_paye,
                'mode_paiement' => $p->mode_paiement ?? 'especes',
                'reference_op'  => $p->reference_paiement ?? '',
                'compte_produit'=> self::COMPTES['annexe_produit'],
                'compte_tresor' => $this->compteTresorerie($p->mode_paiement ?? 'especes'),
            ];
        }

        // Trier par date
        usort($lignes, fn ($a, $b) => strcmp($a['date'], $b['date']));

        return $lignes;
    }

    // ── Génération Excel (3 feuilles) ───────────────────────────────────────

    private function genererExcel(array $lignes, ?string $dateDebut, ?string $dateFin, ?string $annee)
    {
        $etab        = Etablissement::first();
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getProperties()
            ->setCreator($etab?->nom ?? 'Établissement')
            ->setTitle('Export comptable')
            ->setSubject('Encaissements');

        $this->feuille1Journal($spreadsheet, $lignes, $etab, $dateDebut, $dateFin, $annee);
        $this->feuille2Recap($spreadsheet, $lignes);
        $this->feuille3Ecritures($spreadsheet, $lignes);

        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);

        $periode  = ($dateDebut && $dateFin) ? "{$dateDebut}_au_{$dateFin}" : ($annee ?? date('Y'));
        $filename = "export_comptable_{$periode}.xlsx";

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function feuille1Journal(Spreadsheet $s, array $lignes, $etab, $dd, $df, $annee): void
    {
        $ws = $s->getActiveSheet();
        $ws->setTitle('Journal encaissements');

        // Styles couleurs
        $bleu    = '1a5276';
        $bleuCl  = 'd6eaf8';
        $vert    = '27ae60';
        $vertCl  = 'd5f5e3';
        $gris    = 'f2f3f4';

        // Titre
        $titre = $etab?->nom ?? 'Établissement';
        $periode = $dd && $df
            ? "Du " . \Carbon\Carbon::parse($dd)->format('d/m/Y') . " au " . \Carbon\Carbon::parse($df)->format('d/m/Y')
            : ($annee ? "Année scolaire $annee" : "Tous les encaissements");

        $ws->mergeCells('A1:J1');
        $ws->setCellValue('A1', "JOURNAL DES ENCAISSEMENTS — {$titre}");
        $ws->getStyle('A1')->applyFromArray([
            'font'      => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bleu]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension(1)->setRowHeight(24);

        $ws->mergeCells('A2:J2');
        $ws->setCellValue('A2', $periode);
        $ws->getStyle('A2')->applyFromArray([
            'font'      => ['italic' => true, 'color' => ['rgb' => '555555']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // En-têtes
        $headers = ['Date', 'Référence', 'Type', 'Libellé', 'Élève', 'Classe', 'Mode', 'Réf. opération', 'Compte produit', 'Montant (FCFA)'];
        $row = 4;
        foreach ($headers as $col => $h) {
            $cell = Coordinate::stringFromColumnIndex($col + 1) . $row;
            $ws->setCellValue($cell, $h);
        }
        $ws->getStyle("A{$row}:J{$row}")->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bleu]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
        ]);
        $ws->getRowDimension($row)->setRowHeight(18);

        // Données
        $row++;
        $numLigne = 1;
        foreach ($lignes as $l) {
            $isAnnexe = $l['type'] === 'frais_annexe';
            $bg = $isAnnexe ? $vertCl : $bleuCl;

            $ws->setCellValue("A{$row}", $l['date']);
            $ws->getStyle("A{$row}")->getNumberFormat()->setFormatCode('DD/MM/YYYY');
            $ws->setCellValue("B{$row}", $l['reference']);
            $ws->setCellValue("C{$row}", $isAnnexe ? 'Frais annexe' : 'Scolarité');
            $ws->setCellValue("D{$row}", $l['libelle']);
            $ws->setCellValue("E{$row}", $l['eleve']);
            $ws->setCellValue("F{$row}", $l['classe']);
            $ws->setCellValue("G{$row}", ucfirst($l['mode_paiement']));
            $ws->setCellValue("H{$row}", $l['reference_op']);
            $ws->setCellValue("I{$row}", $l['compte_produit']['num'] . ' – ' . $l['compte_produit']['lib']);
            $ws->setCellValue("J{$row}", $l['montant']);
            $ws->getStyle("J{$row}")->getNumberFormat()->setFormatCode('#,##0');

            $ws->getStyle("A{$row}:J{$row}")->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => ($numLigne % 2 === 0 ? $bg : 'FFFFFF')]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E0E0E0']]],
            ]);

            $row++;
            $numLigne++;
        }

        // Ligne total
        $total = array_sum(array_column($lignes, 'montant'));
        $ws->mergeCells("A{$row}:I{$row}");
        $ws->setCellValue("A{$row}", 'TOTAL ENCAISSÉ');
        $ws->setCellValue("J{$row}", $total);
        $ws->getStyle("A{$row}:J{$row}")->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $vert]],
        ]);
        $ws->getStyle("J{$row}")->getNumberFormat()->setFormatCode('#,##0');

        // Largeurs colonnes
        $ws->getColumnDimension('A')->setWidth(14);
        $ws->getColumnDimension('B')->setWidth(14);
        $ws->getColumnDimension('C')->setWidth(14);
        $ws->getColumnDimension('D')->setWidth(28);
        $ws->getColumnDimension('E')->setWidth(26);
        $ws->getColumnDimension('F')->setWidth(10);
        $ws->getColumnDimension('G')->setWidth(12);
        $ws->getColumnDimension('H')->setWidth(16);
        $ws->getColumnDimension('I')->setWidth(30);
        $ws->getColumnDimension('J')->setWidth(16);
    }

    private function feuille2Recap(Spreadsheet $s, array $lignes): void
    {
        $ws = $s->createSheet();
        $ws->setTitle('Récapitulatif');

        $bleu = '1a5276';

        $ws->mergeCells('A1:E1');
        $ws->setCellValue('A1', 'RÉCAPITULATIF DES ENCAISSEMENTS');
        $ws->getStyle('A1')->applyFromArray([
            'font'      => ['bold' => true, 'size' => 13, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bleu]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // ── Par type ─────────────────────────────────────────────────────────
        $row = 3;
        $ws->setCellValue("A{$row}", 'PAR TYPE DE RECETTE');
        $ws->getStyle("A{$row}")->getFont()->setBold(true)->setSize(11);
        $row++;
        foreach ([
            'Droits de scolarité' => collect($lignes)->where('type', 'scolarite')->sum('montant'),
            'Frais annexes'       => collect($lignes)->where('type', 'frais_annexe')->sum('montant'),
        ] as $label => $total) {
            $ws->setCellValue("A{$row}", $label);
            $ws->setCellValue("B{$row}", $total);
            $ws->getStyle("B{$row}")->getNumberFormat()->setFormatCode('#,##0 "FCFA"');
            $row++;
        }
        $ws->setCellValue("A{$row}", 'TOTAL');
        $ws->setCellValue("B{$row}", array_sum(array_column($lignes, 'montant')));
        $ws->getStyle("A{$row}:B{$row}")->getFont()->setBold(true);
        $ws->getStyle("B{$row}")->getNumberFormat()->setFormatCode('#,##0 "FCFA"');

        // ── Par mode de paiement ──────────────────────────────────────────────
        $row += 2;
        $ws->setCellValue("A{$row}", 'PAR MODE DE PAIEMENT');
        $ws->getStyle("A{$row}")->getFont()->setBold(true)->setSize(11);
        $row++;
        $parMode = collect($lignes)->groupBy('mode_paiement');
        $modes   = ['especes' => 'Espèces', 'cheque' => 'Chèque', 'virement' => 'Virement', 'cinetpay' => 'CinetPay', 'autre' => 'Autre'];
        foreach ($modes as $key => $label) {
            if (!$parMode->has($key)) continue;
            $ws->setCellValue("A{$row}", $label);
            $ws->setCellValue("B{$row}", $parMode[$key]->sum('montant'));
            $ws->setCellValue("C{$row}", $parMode[$key]->count() . ' opérations');
            $ws->getStyle("B{$row}")->getNumberFormat()->setFormatCode('#,##0 "FCFA"');
            $row++;
        }

        // ── Par compte OHADA ──────────────────────────────────────────────────
        $row += 2;
        $ws->setCellValue("A{$row}", 'MOUVEMENTS PAR COMPTE OHADA');
        $ws->getStyle("A{$row}")->getFont()->setBold(true)->setSize(11);
        $row++;
        $headers = ['N° Compte', 'Libellé', 'Débit', 'Crédit', 'Solde'];
        foreach ($headers as $col => $h) {
            $ws->setCellValue(Coordinate::stringFromColumnIndex($col + 1) . $row, $h);
        }
        $ws->getStyle("A{$row}:E{$row}")->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'd6eaf8']],
        ]);
        $row++;

        // Comptes de trésorerie (débit)
        $comptesTresor = [];
        foreach ($lignes as $l) {
            $c  = $l['compte_tresor'];
            $num = $c['num'];
            $comptesTresor[$num] = $comptesTresor[$num] ?? ['num' => $num, 'lib' => $c['lib'], 'debit' => 0, 'credit' => 0];
            $comptesTresor[$num]['debit'] += $l['montant'];
        }
        // Comptes de produits (crédit)
        $comptesProd = [];
        foreach ($lignes as $l) {
            $c   = $l['compte_produit'];
            $num = $c['num'];
            $comptesProd[$num] = $comptesProd[$num] ?? ['num' => $num, 'lib' => $c['lib'], 'debit' => 0, 'credit' => 0];
            $comptesProd[$num]['credit'] += $l['montant'];
        }

        foreach (array_merge($comptesTresor, $comptesProd) as $c) {
            $ws->setCellValue("A{$row}", $c['num']);
            $ws->setCellValue("B{$row}", $c['lib']);
            $ws->setCellValue("C{$row}", $c['debit'] ?: '');
            $ws->setCellValue("D{$row}", $c['credit'] ?: '');
            $ws->setCellValue("E{$row}", $c['debit'] - $c['credit']);
            foreach (['C', 'D', 'E'] as $col) {
                if ($ws->getCell("{$col}{$row}")->getValue() !== '') {
                    $ws->getStyle("{$col}{$row}")->getNumberFormat()->setFormatCode('#,##0');
                }
            }
            $row++;
        }

        $ws->getColumnDimension('A')->setWidth(14);
        $ws->getColumnDimension('B')->setWidth(30);
        $ws->getColumnDimension('C')->setWidth(16);
        $ws->getColumnDimension('D')->setWidth(16);
        $ws->getColumnDimension('E')->setWidth(16);
    }

    private function feuille3Ecritures(Spreadsheet $s, array $lignes): void
    {
        $ws = $s->createSheet();
        $ws->setTitle('Écritures SAGE');

        $bleu = '2e86c1';

        $ws->mergeCells('A1:J1');
        $ws->setCellValue('A1', 'ÉCRITURES COMPTABLES — Format compatible SAGE / FEC OHADA');
        $ws->getStyle('A1')->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bleu]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // En-têtes FEC
        $headers = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'PieceRef', 'EcritureLib', 'Debit', 'Credit'];
        $row = 3;
        foreach ($headers as $col => $h) {
            $ws->setCellValue(Coordinate::stringFromColumnIndex($col + 1) . $row, $h);
        }
        $ws->getStyle("A{$row}:K{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bleu]],
        ]);

        $row++;
        $numEcriture = 1;
        foreach ($lignes as $l) {
            $journalCode = $l['type'] === 'scolarite' ? 'SCO' : 'FRA';
            $journalLib  = $l['type'] === 'scolarite' ? 'Scolarités' : 'Frais annexes';
            $ecritureNum = sprintf('%s%06d', $journalCode, $numEcriture);
            $dateFormate = str_replace('-', '', $l['date']); // YYYYMMDD pour SAGE
            $compAux     = $l['eleve'];

            // Ligne 1 : Débit compte de trésorerie
            $tr = $l['compte_tresor'];
            $ws->fromArray([
                $journalCode, $journalLib, $ecritureNum, $dateFormate,
                $tr['num'], $tr['lib'], $compAux,
                $l['reference'], $l['libelle'],
                $l['montant'], 0,
            ], null, "A{$row}");
            $ws->getStyle("J{$row}:K{$row}")->getNumberFormat()->setFormatCode('#,##0.00');
            $row++;

            // Ligne 2 : Crédit compte de produit
            $pr = $l['compte_produit'];
            $ws->fromArray([
                $journalCode, $journalLib, $ecritureNum, $dateFormate,
                $pr['num'], $pr['lib'], $compAux,
                $l['reference'], $l['libelle'],
                0, $l['montant'],
            ], null, "A{$row}");
            $ws->getStyle("J{$row}:K{$row}")->getNumberFormat()->setFormatCode('#,##0.00');
            $row++;

            $numEcriture++;
        }

        foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as $col) {
            $ws->getColumnDimension($col)->setAutoSize(true);
        }
        $ws->getColumnDimension('J')->setWidth(14);
        $ws->getColumnDimension('K')->setWidth(14);
    }

    // ── Export FEC (CSV pur pour SAGE) ──────────────────────────────────────

    private function genererFec(array $lignes, ?string $dateDebut, ?string $dateFin, ?string $annee)
    {
        $periode  = ($dateDebut && $dateFin) ? "{$dateDebut}_au_{$dateFin}" : ($annee ?? date('Y'));
        $filename = "FEC_comptable_{$periode}.csv";

        $headers = "JournalCode;JournalLib;EcritureNum;EcritureDate;CompteNum;CompteLib;CompAuxNum;PieceRef;EcritureLib;Debit;Credit\n";
        $rows    = '';
        $num     = 1;

        foreach ($lignes as $l) {
            $jCode = $l['type'] === 'scolarite' ? 'SCO' : 'FRA';
            $jLib  = $l['type'] === 'scolarite' ? 'Scolarités' : 'Frais annexes';
            $enum  = sprintf('%s%06d', $jCode, $num);
            $date  = str_replace('-', '', $l['date']);
            $aux   = $this->escapeCsv($l['eleve']);
            $lib   = $this->escapeCsv($l['libelle']);

            $tr = $l['compte_tresor'];
            $pr = $l['compte_produit'];

            $rows .= implode(';', [$jCode, $jLib, $enum, $date, $tr['num'], $this->escapeCsv($tr['lib']), $aux, $l['reference'], $lib, number_format($l['montant'], 2, '.', ''), '0.00']) . "\n";
            $rows .= implode(';', [$jCode, $jLib, $enum, $date, $pr['num'], $this->escapeCsv($pr['lib']), $aux, $l['reference'], $lib, '0.00', number_format($l['montant'], 2, '.', '')]) . "\n";

            $num++;
        }

        return response($headers . $rows, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function nomEleve($eleve): string
    {
        if (!$eleve) return '';
        return strtoupper($eleve->nom_eleve) . ' ' . $eleve->prenoms_eleve;
    }

    private function compteTresorerie(string $mode): array
    {
        $num = self::MODE_TRESORERIE[$mode] ?? '571000';
        $libs = ['571000' => 'Caisse', '521000' => 'Banque', '512000' => 'Mobile Money / CinetPay'];
        return ['num' => $num, 'lib' => $libs[$num] ?? 'Trésorerie'];
    }

    private function escapeCsv(string $val): string
    {
        if (str_contains($val, ';') || str_contains($val, '"')) {
            return '"' . str_replace('"', '""', $val) . '"';
        }
        return $val;
    }
}
