<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Matiere;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MatiereController extends Controller
{
    // Champs de paramétrage emploi du temps, tous optionnels (chantier EDT — Lot 0.1).
    private const CHAMPS_EDT = ['famille', 'couleur', 'salle_type_requis', 'effort_soutenu'];

    public function index()
    {
        $matieres = Matiere::all();

        return response()->json($matieres);
    }

    /**
     * Référentiel des familles de matières + types de salle (selects de
     * configuration et assistant d'affectation). Cf. chantier EDT — Lot 0.1.
     */
    public function familles()
    {
        $familles = collect(Matiere::FAMILLES)->map(fn ($v, $code) => [
            'code'    => $code,
            'libelle' => $v[0],
            'couleur' => $v[1],
        ])->values();

        return response()->json([
            'familles'    => $familles,
            'types_salle' => Matiere::TYPES_SALLE,
            'suggestions' => Matiere::SUGGESTIONS_FAMILLE,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate($this->regles());

        $matiere = Matiere::create($request->only(array_merge(
            ['abbr_matiere', 'libelle_matiere', 'description_matiere'],
            self::CHAMPS_EDT,
        )));

        return response()->json(['status' => 'success', 'matiere' => $matiere], 201);
    }

    public function show(Matiere $matiere)
    {
        return response()->json($matiere);
    }

    public function update(Request $request, Matiere $matiere)
    {
        $request->validate($this->regles());

        $matiere->update($request->only(array_merge(
            ['abbr_matiere', 'libelle_matiere', 'description_matiere'],
            self::CHAMPS_EDT,
        )));

        return response()->json(['status' => 'success', 'matiere' => $matiere]);
    }

    /**
     * Règles de validation communes. Les champs EDT sont optionnels : une
     * matière créée sans eux reste valide (non-régression).
     */
    private function regles(): array
    {
        return [
            'abbr_matiere'        => 'required',
            'libelle_matiere'     => 'required',
            'description_matiere' => 'required',
            'famille'             => ['nullable', Rule::in(array_keys(Matiere::FAMILLES))],
            'couleur'             => 'nullable|string|max:20',
            'salle_type_requis'   => ['nullable', Rule::in(Matiere::TYPES_SALLE)],
            'effort_soutenu'      => 'nullable|boolean',
        ];
    }

    public function destroy(Matiere $matiere)
    {
        $matiere->delete();

        return response()->json(['status' => 'success']);
    }
}
