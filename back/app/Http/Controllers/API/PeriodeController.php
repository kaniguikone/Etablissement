<?php

namespace App\Http\Controllers\API;

use App\Models\Periodes;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class PeriodeController extends Controller
{
    public function index(Request $request)
    {
        $query = Periodes::with('anneeScolaire');

        // Filtre optionnel par année scolaire
        if ($request->has('annee_scolaire_id')) {
            $query->where('annee_scolaire_id', $request->annee_scolaire_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'libelle_periode'      => 'required|string|max:255',
            'abbr_libelle_periode' => 'required|string|max:50',
            'code_periode'         => 'nullable|string|max:10',
            'annee'                => 'required|string|max:10',
            'date_debut'           => 'required|date',
            'date_fin'             => 'required|date|after_or_equal:date_debut',
        ]);

        $periode = Periodes::create($request->only([
            'libelle_periode', 'abbr_libelle_periode', 'code_periode', 'annee',
            'date_debut', 'date_fin', 'annee_scolaire_id',
        ]));

        return response()->json($periode, 201);
    }

    public function parDate(Request $request)
    {
        $request->validate(['date' => 'required|date']);

        $periode = Periodes::whereDate('date_debut', '<=', $request->date)
            ->whereDate('date_fin', '>=', $request->date)
            ->first();

        // response()->json(null) sérialise en {} à cause de Symfony — on force le JSON null explicite
        return $periode
            ? response()->json($periode)
            : response('null', 200)->header('Content-Type', 'application/json');
    }

    public function show(string $id)
    {
        $periode = Periodes::findOrFail($id);

        return response()->json($periode);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'libelle_periode'      => 'required|string|max:255',
            'abbr_libelle_periode' => 'required|string|max:50',
            'code_periode'         => 'nullable|string|max:10',
            'annee'                => 'required|string|max:10',
            'date_debut'           => 'required|date',
            'date_fin'             => 'required|date|after_or_equal:date_debut',
        ]);

        $periode = Periodes::findOrFail($id);
        $periode->update($request->only([
            'libelle_periode', 'abbr_libelle_periode', 'code_periode', 'annee',
            'date_debut', 'date_fin', 'annee_scolaire_id',
        ]));

        return response()->json($periode);
    }

    public function destroy(string $id)
    {
        $periode = Periodes::findOrFail($id);
        $periode->delete();

        return response()->json(null, 204);
    }
}
