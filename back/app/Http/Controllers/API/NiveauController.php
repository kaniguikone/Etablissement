<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Niveau;
use Illuminate\Http\Request;

class NiveauController extends Controller
{
    public function index()
    {
        $niveaux = Niveau::all();

        return response()->json($niveaux);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nom_niveau'  => 'required',
            'abbr_niveau' => 'required',
        ]);

        $niveau = Niveau::create([
            'nom_niveau'  => $request->nom_niveau,
            'abbr_niveau' => $request->abbr_niveau,
        ]);

        return response()->json(['status' => 'success', 'niveau' => $niveau], 201);
    }

    public function show(Niveau $niveau)
    {
        return response()->json($niveau);
    }

    public function update(Request $request, Niveau $niveau)
    {
        $request->validate([
            'nom_niveau'  => 'required',
            'abbr_niveau' => 'required',
        ]);

        $niveau->update([
            'nom_niveau'  => $request->nom_niveau,
            'abbr_niveau' => $request->abbr_niveau,
        ]);

        return response()->json(['status' => 'success', 'niveau' => $niveau]);
    }

    public function destroy(Niveau $niveau)
    {
        $niveau->delete();

        return response()->json(['status' => 'success']);
    }
}
