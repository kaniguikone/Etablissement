<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BudgetDepense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
}
