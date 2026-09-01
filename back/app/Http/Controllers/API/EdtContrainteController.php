<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EdtContrainte;
use App\Models\EmploiDuTemps;
use App\Services\Edt\Validateur;
use Illuminate\Http\Request;

/**
 * Catalogue des contraintes MENET + contrôle qualité d'un emploi du temps
 * (chantier EDT — Lot 1).
 */
class EdtContrainteController extends Controller
{
    public function index()
    {
        return response()->json(
            EdtContrainte::orderByRaw("nature = 'souple'")->orderBy('code')->get()
        );
    }

    public function update(Request $request, string $code)
    {
        $contrainte = EdtContrainte::where('code', $code)->firstOrFail();

        $data = $request->validate([
            'active' => 'sometimes|boolean',
            'poids' => 'sometimes|integer|min:0|max:1000',
            'parametres' => 'sometimes|nullable|array',
        ]);

        // Les contraintes dures ne sont pas désactivables.
        if ($contrainte->nature === 'dure') {
            unset($data['active']);
        }

        $contrainte->update($data);

        return response()->json($contrainte);
    }

    /**
     * Contrôle l'emploi du temps courant contre le catalogue de contraintes.
     * GET /edt/controle?niveau_id=&classe_id=
     */
    public function controle(Request $request)
    {
        $request->validate([
            'niveau_id' => 'nullable|exists:niveaux,id',
            'classe_id' => 'nullable|exists:classes,id',
        ]);

        $query = EmploiDuTemps::with(['classe.niveau', 'matiere', 'enseignant', 'salle']);
        if ($request->classe_id) {
            $query->where('classe_id', $request->classe_id);
        } elseif ($request->niveau_id) {
            $query->whereHas('classe', fn ($q) => $q->where('niveau_id', $request->niveau_id));
        }

        $creneaux = $query->get();

        if ($creneaux->isEmpty()) {
            return response()->json([
                'score' => 0, 'nb_dures' => 0, 'nb_souples' => 0,
                'violations' => [], 'nb_creneaux' => 0,
            ]);
        }

        $rapport = (new Validateur)->analyser($creneaux);
        $rapport['nb_creneaux'] = $creneaux->count();

        return response()->json($rapport);
    }
}
