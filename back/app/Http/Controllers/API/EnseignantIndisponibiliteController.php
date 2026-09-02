<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Enseignant;
use App\Models\EnseignantIndisponibilite;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Indisponibilités des enseignants — chantier EDT, Lot 0.5.
 */
class EnseignantIndisponibiliteController extends Controller
{
    /** Vue d'ensemble (tous les enseignants) — pour le diagnostic. */
    public function index()
    {
        $items = EnseignantIndisponibilite::with('enseignant:id,nom_enseignant,prenoms_enseignant')
            ->orderBy('enseignant_id')
            ->orderBy('jour')
            ->get();

        return response()->json($items);
    }

    public function parEnseignant(int $id)
    {
        Enseignant::findOrFail($id);

        return response()->json(
            EnseignantIndisponibilite::where('enseignant_id', $id)
                ->with('plageHoraire:id,libelle,heure_debut,heure_fin')
                ->orderBy('jour')
                ->get()
        );
    }

    public function store(Request $request, int $id)
    {
        Enseignant::findOrFail($id);

        $data = $request->validate([
            'jour' => ['required', Rule::in(EnseignantIndisponibilite::JOURS)],
            'plage_horaire_id' => 'nullable|exists:plages_horaires,id',
            'heure_debut' => 'nullable|date_format:H:i|required_without:plage_horaire_id',
            'heure_fin' => 'nullable|date_format:H:i|required_with:heure_debut',
            'type' => ['nullable', Rule::in(EnseignantIndisponibilite::TYPES)],
            'motif' => 'nullable|string|max:120',
        ]);

        if (empty($data['plage_horaire_id']) && empty($data['heure_debut'])) {
            return response()->json(['message' => 'Précisez une plage de la grille ou un intervalle horaire.'], 422);
        }
        if (! empty($data['heure_debut']) && ! empty($data['heure_fin']) && $data['heure_fin'] <= $data['heure_debut']) {
            return response()->json(['message' => "L'heure de fin doit être après l'heure de début."], 422);
        }

        $data['enseignant_id'] = $id;
        $data['type'] ??= 'bloquant';

        $indispo = EnseignantIndisponibilite::create($data);

        return response()->json($indispo, 201);
    }

    public function destroy(int $id)
    {
        EnseignantIndisponibilite::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
