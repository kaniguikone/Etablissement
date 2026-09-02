<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\GroupePedagogique;
use Illuminate\Http\Request;

/**
 * Groupes pédagogiques (LV2, dédoublements) — chantier EDT, Lot 4.
 */
class GroupePedagogiqueController extends Controller
{
    public function index(Request $request)
    {
        $query = GroupePedagogique::with([
            'matiere:id,libelle_matiere,abbr_matiere',
            'enseignant:id,nom_enseignant,prenoms_enseignant',
            'classe:id,nom_classe',
        ])->orderBy('classe_id')->orderBy('parallele_code');

        if ($request->classe_id) {
            $query->where('classe_id', $request->classe_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $groupe = GroupePedagogique::create($this->valider($request));

        return response()->json($groupe->load(['matiere', 'enseignant']), 201);
    }

    public function update(Request $request, int $id)
    {
        $groupe = GroupePedagogique::findOrFail($id);
        $groupe->update($this->valider($request));

        return response()->json($groupe->load(['matiere', 'enseignant']));
    }

    public function destroy(int $id)
    {
        GroupePedagogique::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function valider(Request $request): array
    {
        return $request->validate([
            'classe_id' => 'required|exists:classes,id',
            'matiere_id' => 'required|exists:matieres,id',
            'enseignant_id' => 'nullable|exists:enseignants,id',
            'libelle' => 'required|string|max:80',
            'parallele_code' => 'required|string|max:30',
            'effectif' => 'nullable|integer|min:1|max:100',
            'nb_seances' => 'nullable|integer|min:0|max:20',
            'duree_minutes' => 'nullable|integer|min:30|max:240',
            'semaine' => 'nullable|in:toutes,A,B',
        ]);
    }
}
