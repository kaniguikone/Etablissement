<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Salle;
use App\Models\EmploiDuTemps;
use Illuminate\Http\Request;

class SalleController extends Controller
{
    private const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    public function index(Request $request)
    {
        $query = Salle::query();
        if ($request->has('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        return response()->json($query->orderBy('nom')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nom'       => 'required|string|max:100|unique:salles,nom',
            'capacite'  => 'nullable|integer|min:1',
            'type'      => 'required|in:classe,labo,salle_info,gymnase,autre',
            'batiment'  => 'nullable|string|max:100',
            'actif'     => 'boolean',
        ]);

        $salle = Salle::create($request->only(['nom', 'capacite', 'type', 'batiment', 'actif']));
        return response()->json($salle, 201);
    }

    public function show(int $id)
    {
        return response()->json(Salle::findOrFail($id));
    }

    public function update(Request $request, int $id)
    {
        $salle = Salle::findOrFail($id);

        $request->validate([
            'nom'       => 'required|string|max:100|unique:salles,nom,' . $id,
            'capacite'  => 'nullable|integer|min:1',
            'type'      => 'required|in:classe,labo,salle_info,gymnase,autre',
            'batiment'  => 'nullable|string|max:100',
            'actif'     => 'boolean',
        ]);

        $salle->update($request->only(['nom', 'capacite', 'type', 'batiment', 'actif']));
        return response()->json($salle);
    }

    public function destroy(int $id)
    {
        $salle = Salle::findOrFail($id);

        // Vérifier si la salle est utilisée dans l'emploi du temps
        $nbCreneaux = EmploiDuTemps::where('salle_id', $id)->count();
        if ($nbCreneaux > 0) {
            return response()->json([
                'message' => "Impossible de supprimer : cette salle est utilisée dans $nbCreneaux créneau(x) d'emploi du temps.",
            ], 422);
        }

        $salle->delete();
        return response()->json(null, 204);
    }

    /**
     * Planning d'occupation d'une salle : créneaux groupés par jour.
     */
    public function planning(int $id)
    {
        Salle::findOrFail($id);

        $creneaux = EmploiDuTemps::with(['classe', 'matiere', 'enseignant'])
            ->where('salle_id', $id)
            ->get()
            ->groupBy('jour')
            ->sortKeysUsing(fn ($a, $b) =>
                array_search($a, self::JOURS) <=> array_search($b, self::JOURS)
            );

        return response()->json($creneaux);
    }
}
