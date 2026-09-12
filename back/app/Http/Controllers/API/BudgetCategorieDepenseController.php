<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BudgetCategorieDepense;
use Illuminate\Http\Request;

class BudgetCategorieDepenseController extends Controller
{
    public function index()
    {
        return response()->json(BudgetCategorieDepense::orderBy('nom')->get());
    }

    public function store(Request $request)
    {
        $request->validate(['nom' => 'required|string|max:150|unique:budget_categories_depense,nom']);

        $categorie = BudgetCategorieDepense::create(['nom' => $request->nom, 'actif' => true]);

        return response()->json($categorie, 201);
    }

    public function update(Request $request, string $id)
    {
        $categorie = BudgetCategorieDepense::findOrFail($id);

        $request->validate([
            'nom'   => 'required|string|max:150|unique:budget_categories_depense,nom,' . $categorie->id,
            'actif' => 'boolean',
        ]);

        $categorie->update($request->only(['nom', 'actif']));

        return response()->json($categorie);
    }

    public function destroy(string $id)
    {
        $categorie = BudgetCategorieDepense::findOrFail($id);

        if ($categorie->depenses()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer cette catégorie : des dépenses y sont associées.',
            ], 422);
        }

        $categorie->delete();
        return response()->json(null, 204);
    }
}
