<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Matiere;
use Illuminate\Http\Request;

class MatiereController extends Controller
{
    public function index()
    {
        $matieres = Matiere::all();

        return response()->json($matieres);
    }

    public function store(Request $request)
    {
        $request->validate([
            'abbr_matiere'        => 'required',
            'libelle_matiere'     => 'required',
            'description_matiere' => 'required',
        ]);

        $matiere = Matiere::create([
            'abbr_matiere'        => $request->abbr_matiere,
            'libelle_matiere'     => $request->libelle_matiere,
            'description_matiere' => $request->description_matiere,
        ]);

        return response()->json(['status' => 'success', 'matiere' => $matiere], 201);
    }

    public function show(Matiere $matiere)
    {
        return response()->json($matiere);
    }

    public function update(Request $request, Matiere $matiere)
    {
        $request->validate([
            'abbr_matiere'        => 'required',
            'libelle_matiere'     => 'required',
            'description_matiere' => 'required',
        ]);

        $matiere->update([
            'abbr_matiere'        => $request->abbr_matiere,
            'libelle_matiere'     => $request->libelle_matiere,
            'description_matiere' => $request->description_matiere,
        ]);

        return response()->json(['status' => 'success', 'matiere' => $matiere]);
    }

    public function destroy(Matiere $matiere)
    {
        $matiere->delete();

        return response()->json(['status' => 'success']);
    }
}
