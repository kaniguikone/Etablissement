<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\BudgetDepense;
use App\Models\BudgetDotation;
use App\Models\Etablissement;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class BudgetDepenseController extends Controller
{
    public function index(Request $request)
    {
        $query = BudgetDepense::with(['categorie', 'saisiePar:id,name', 'periode'])
            ->orderBy('date_depense', 'desc');

        if ($request->filled('annee_scolaire_id')) $query->where('annee_scolaire_id', $request->annee_scolaire_id);
        if ($request->filled('categorie_id'))       $query->where('categorie_id', $request->categorie_id);
        if ($request->filled('periode_id'))         $query->where('periode_id', $request->periode_id);

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'annee_scolaire_id' => 'required|exists:annees_scolaires,id',
            'periode_id'         => 'nullable|exists:periodes,id',
            'categorie_id'       => 'required|exists:budget_categories_depense,id',
            'libelle'            => 'required|string|max:255',
            'montant'            => 'required|numeric|min:1',
            'date_depense'       => 'required|date',
            'beneficiaire'       => 'nullable|string|max:255',
            'mode_paiement'      => 'required|in:especes,cheque,virement,mobile_money,autre',
            'justificatif'       => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $solde = BudgetDepense::soldeDisponible((int) $request->annee_scolaire_id);
        if ((float) $request->montant > $solde) {
            return response()->json([
                'message' => 'Solde insuffisant : ' . number_format($solde, 0, ',', ' ') . ' FCFA disponible(s).',
                'solde_disponible' => $solde,
            ], 422);
        }

        $data = $request->only([
            'annee_scolaire_id', 'periode_id', 'categorie_id', 'libelle',
            'montant', 'date_depense', 'beneficiaire', 'mode_paiement',
        ]);
        $data['saisie_par_id'] = $request->user()->id;

        if ($request->hasFile('justificatif')) {
            $data['justificatif_path'] = $request->file('justificatif')->store('budget/justificatifs', 'public');
        }

        $depense = BudgetDepense::create($data);

        return response()->json($depense->load(['categorie', 'saisiePar:id,name']), 201);
    }

    public function update(Request $request, string $id)
    {
        $depense = BudgetDepense::findOrFail($id);

        $request->validate([
            'periode_id'    => 'nullable|exists:periodes,id',
            'categorie_id'  => 'required|exists:budget_categories_depense,id',
            'libelle'       => 'required|string|max:255',
            'montant'       => 'required|numeric|min:1',
            'date_depense'  => 'required|date',
            'beneficiaire'  => 'nullable|string|max:255',
            'mode_paiement' => 'required|in:especes,cheque,virement,mobile_money,autre',
            'justificatif'  => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        // Le solde re-crédite le montant actuel de la dépense avant de vérifier le nouveau montant.
        $soldeSansCetteDepense = BudgetDepense::soldeDisponible($depense->annee_scolaire_id) + (float) $depense->montant;
        if ((float) $request->montant > $soldeSansCetteDepense) {
            return response()->json([
                'message' => 'Solde insuffisant : ' . number_format($soldeSansCetteDepense, 0, ',', ' ') . ' FCFA disponible(s).',
                'solde_disponible' => $soldeSansCetteDepense,
            ], 422);
        }

        $data = $request->only(['periode_id', 'categorie_id', 'libelle', 'montant', 'date_depense', 'beneficiaire', 'mode_paiement']);

        if ($request->hasFile('justificatif')) {
            if ($depense->justificatif_path) {
                Storage::disk('public')->delete($depense->justificatif_path);
            }
            $data['justificatif_path'] = $request->file('justificatif')->store('budget/justificatifs', 'public');
        }

        $depense->update($data);

        return response()->json($depense->load(['categorie', 'saisiePar:id,name']));
    }

    public function destroy(string $id)
    {
        $depense = BudgetDepense::findOrFail($id);

        if ($depense->justificatif_path) {
            Storage::disk('public')->delete($depense->justificatif_path);
        }

        $depense->delete();
        return response()->json(null, 204);
    }

    public function solde(Request $request)
    {
        $request->validate(['annee_scolaire_id' => 'required|exists:annees_scolaires,id']);

        $anneeId = (int) $request->annee_scolaire_id;

        $octroye = (float) \App\Models\BudgetDotation::where('annee_scolaire_id', $anneeId)
            ->where('statut', \App\Models\BudgetDotation::STATUT_APPROUVEE)
            ->sum('montant_octroye');
        $depense = (float) BudgetDepense::where('annee_scolaire_id', $anneeId)->sum('montant');

        return response()->json([
            'octroye' => $octroye,
            'depense' => $depense,
            'solde'   => $octroye - $depense,
        ]);
    }

    public function dashboard(Request $request)
    {
        $request->validate(['annee_scolaire_id' => 'required|exists:annees_scolaires,id']);
        $anneeId = (int) $request->annee_scolaire_id;

        $parCategorie = BudgetDepense::with('categorie:id,nom')
            ->where('annee_scolaire_id', $anneeId)
            ->get()
            ->groupBy('categorie_id')
            ->map(fn($lignes) => [
                'categorie' => $lignes->first()->categorie?->nom ?? '—',
                'total'     => (float) $lignes->sum('montant'),
                'nb'        => $lignes->count(),
            ])
            ->values();

        $parMois = BudgetDepense::where('annee_scolaire_id', $anneeId)
            ->selectRaw("DATE_FORMAT(date_depense, '%Y-%m') as mois, SUM(montant) as total")
            ->groupBy('mois')
            ->orderBy('mois')
            ->get();

        return response()->json([
            'par_categorie' => $parCategorie,
            'par_mois'      => $parMois,
        ]);
    }

    /**
     * Registre des dépenses de l'année (classeur unique), pour usage comptable —
     * même pattern que ExportComptableController/StatsGeneralesController::exportExcel.
     */
    public function exportExcel(Request $request)
    {
        $request->validate(['annee_scolaire_id' => 'required|exists:annees_scolaires,id']);
        $annee = AnneeScolaire::findOrFail($request->annee_scolaire_id);

        $depenses = BudgetDepense::with('categorie:id,nom')
            ->where('annee_scolaire_id', $annee->id)
            ->orderBy('date_depense')
            ->get();

        $octroye = (float) BudgetDotation::where('annee_scolaire_id', $annee->id)
            ->where('statut', BudgetDotation::STATUT_APPROUVEE)
            ->sum('montant_octroye');
        $totalDepense = (float) $depenses->sum('montant');

        $wb = new Spreadsheet();
        $ws = $wb->getActiveSheet();
        $ws->setTitle('Dépenses ' . $annee->libelle);

        $ws->setCellValue('A1', 'REGISTRE DES DÉPENSES — BUDGET ' . strtoupper($annee->libelle));
        $ws->mergeCells('A1:G1');
        $ws->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 13, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E79']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $ws->setCellValue('A2', 'Octroyé');
        $ws->setCellValue('B2', $octroye);
        $ws->setCellValue('C2', 'Dépensé');
        $ws->setCellValue('D2', $totalDepense);
        $ws->setCellValue('E2', 'Solde');
        $ws->setCellValue('F2', $octroye - $totalDepense);
        $ws->getStyle('A2:F2')->applyFromArray(['font' => ['bold' => true]]);

        $headers = ['Date', 'Libellé', 'Catégorie', 'Bénéficiaire', 'Mode de paiement', 'Montant (FCFA)', 'Saisi par'];
        foreach ($headers as $i => $h) {
            $ws->setCellValue([$i + 1, 4], $h);
        }
        $ws->getStyle('A4:G4')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2E75B6']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);

        $modes = ['especes' => 'Espèces', 'cheque' => 'Chèque', 'virement' => 'Virement', 'mobile_money' => 'Mobile Money', 'autre' => 'Autre'];
        $row = 5;
        foreach ($depenses as $d) {
            $ws->setCellValue([1, $row], \Carbon\Carbon::parse($d->date_depense)->format('d/m/Y'));
            $ws->setCellValue([2, $row], $d->libelle);
            $ws->setCellValue([3, $row], $d->categorie?->nom ?? '—');
            $ws->setCellValue([4, $row], $d->beneficiaire ?? '—');
            $ws->setCellValue([5, $row], $modes[$d->mode_paiement] ?? $d->mode_paiement);
            $ws->setCellValue([6, $row], (float) $d->montant);
            $ws->setCellValue([7, $row], $d->saisiePar?->name ?? '—');
            $row++;
        }
        $lastRow = $row - 1;

        if ($lastRow >= 5) {
            $ws->getStyle("A5:G{$lastRow}")->applyFromArray(['borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]]);
        }
        $ws->setCellValue([5, $row], 'TOTAL');
        $ws->setCellValue([6, $row], $totalDepense);
        $ws->getStyle("E{$row}:F{$row}")->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFF2CC']],
        ]);

        foreach (range('A', 'G') as $col) {
            $ws->getColumnDimension($col)->setAutoSize(true);
        }

        $writer   = new Xlsx($wb);
        $filename = 'budget_depenses_' . $annee->libelle . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Rapport budgétaire imprimable (dotations approuvées, dépenses, répartition
     * par catégorie) — même pattern que FraisAnnexeController::recu.
     */
    public function rapportPdf(Request $request)
    {
        $request->validate(['annee_scolaire_id' => 'required|exists:annees_scolaires,id']);
        $annee = AnneeScolaire::findOrFail($request->annee_scolaire_id);
        $etablissement = Etablissement::first();

        $dotations = BudgetDotation::with('demandeur:id,name')
            ->where('annee_scolaire_id', $annee->id)
            ->where('statut', BudgetDotation::STATUT_APPROUVEE)
            ->orderBy('validee_le')
            ->get();

        $depenses = BudgetDepense::with(['categorie:id,nom', 'saisiePar:id,name'])
            ->where('annee_scolaire_id', $annee->id)
            ->orderBy('date_depense')
            ->get();

        $octroye = (float) $dotations->sum('montant_octroye');
        $totalDepense = (float) $depenses->sum('montant');

        $parCategorie = $depenses->groupBy('categorie_id')->map(fn($lignes) => [
            'categorie' => $lignes->first()->categorie?->nom ?? '—',
            'total'     => (float) $lignes->sum('montant'),
        ])->values();

        $pdf = Pdf::loadView('budget.rapport', compact(
            'annee', 'etablissement', 'dotations', 'depenses', 'octroye', 'totalDepense', 'parCategorie'
        ))->setPaper('A4', 'portrait');

        return $pdf->download('rapport_budget_' . $annee->libelle . '.pdf');
    }
}
