<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EvenementCalendrier;
use Illuminate\Http\Request;

class CalendrierController extends Controller
{
    /**
     * Liste des événements.
     * Filtres optionnels: mois, annee (renvoie les événements qui touchent ce mois)
     */
    public function index(Request $request)
    {
        $query = EvenementCalendrier::with('classe');

        if ($request->filled('annee') && $request->filled('mois')) {
            $debut = sprintf('%04d-%02d-01', $request->annee, $request->mois);
            $fin   = date('Y-m-t', strtotime($debut));

            // Événements qui commencent ou se terminent dans le mois,
            // ou qui englobent tout le mois.
            $query->where(function ($q) use ($debut, $fin) {
                $q->whereBetween('date_debut', [$debut, $fin])
                  ->orWhereBetween('date_fin', [$debut, $fin])
                  ->orWhere(function ($q2) use ($debut, $fin) {
                      $q2->where('date_debut', '<=', $debut)
                         ->where('date_fin', '>=', $fin);
                  });
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json($query->orderBy('date_debut')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'titre'       => 'required|string|max:200',
            'description' => 'nullable|string',
            'date_debut'  => 'required|date',
            'date_fin'    => 'nullable|date|after_or_equal:date_debut',
            'type'        => 'required|in:conge,examen,reunion,sortie,autre',
            'couleur'     => 'nullable|string|max:7',
            'classe_id'   => 'nullable|exists:classes,id',
        ]);

        $evenement = EvenementCalendrier::create($request->only([
            'titre', 'description', 'date_debut', 'date_fin',
            'type', 'couleur', 'classe_id',
        ]));

        return response()->json($evenement->load('classe'), 201);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'titre'       => 'required|string|max:200',
            'description' => 'nullable|string',
            'date_debut'  => 'required|date',
            'date_fin'    => 'nullable|date|after_or_equal:date_debut',
            'type'        => 'required|in:conge,examen,reunion,sortie,autre',
            'couleur'     => 'nullable|string|max:7',
            'classe_id'   => 'nullable|exists:classes,id',
        ]);

        $evenement = EvenementCalendrier::findOrFail($id);
        $evenement->update($request->only([
            'titre', 'description', 'date_debut', 'date_fin',
            'type', 'couleur', 'classe_id',
        ]));

        return response()->json($evenement->load('classe'));
    }

    public function destroy(string $id)
    {
        EvenementCalendrier::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
