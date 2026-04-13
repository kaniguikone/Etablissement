<?php

namespace App\Http\Controllers\API;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Scolarites;

class ScolariteController extends Controller
{
    public function index()
    {
        $scolarites = Scolarites::with('niveau')->paginate(15);

        return response()->json($scolarites);
    }

    public function ScolaritesNiveau($id)
    {
        $scolarites = Scolarites::where('niveau_id', '=', $id)->with('niveau')->get();
        return response()->json($scolarites);
    }

    public function store(Request $request)
    {
        $request->validate([
            'libelle_echeance' => 'required|string|max:255',
            'date_echeance'    => 'required|date',
            'montant_echeance' => 'required|string|max:255',
            'niveau_id'        => 'required|exists:niveaux,id',
        ]);

        $scolarite = Scolarites::create($request->only([
            'libelle_echeance', 'date_echeance', 'montant_echeance', 'niveau_id',
        ]));

        return response()->json($scolarite->load('niveau'), 201);
    }

    public function show(string $id)
    {
        $scolarite = Scolarites::with('niveau')->findOrFail($id);

        return response()->json($scolarite);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'libelle_echeance' => 'required|string|max:255',
            'date_echeance'    => 'required|date',
            'montant_echeance' => 'required|string|max:255',
            'niveau_id'        => 'required|exists:niveaux,id',
        ]);

        $scolarite = Scolarites::findOrFail($id);
        $scolarite->update($request->only([
            'libelle_echeance', 'date_echeance', 'montant_echeance', 'niveau_id',
        ]));

        return response()->json($scolarite->load('niveau'));
    }

    public function destroy(string $id)
    {
        $scolarite = Scolarites::findOrFail($id);
        $scolarite->delete();

        return response()->json(null, 204);
    }
}
