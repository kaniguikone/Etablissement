<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Niveau;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NiveauController extends Controller
{
    public function index()
    {
        $niveaux = Niveau::withCount('classes')
            ->addSelect(DB::raw(
                '(SELECT COUNT(*) FROM eleves
                  JOIN classes ON eleves.classe_id = classes.id
                  WHERE classes.niveau_id = niveaux.id) as nb_eleves'
            ))
            ->orderBy('ordre')
            ->orderBy('id')
            ->get();

        return response()->json($niveaux);
    }

    public function show($id)
    {
        $niveau  = Niveau::withCount('classes')->findOrFail($id);
        $classes = DB::table('classes')
            ->where('niveau_id', $id)
            ->orderBy('num_classe')
            ->get(['id', 'nom_classe', 'abbr_classe', 'num_classe']);

        return response()->json(['niveau' => $niveau, 'classes' => $classes]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nom_niveau'  => 'required|string|unique:niveaux,nom_niveau',
            'abbr_niveau' => 'required|string',
            'ordre'       => 'nullable|integer|min:1',
        ]);

        $ordre = $request->ordre ?? ((int) DB::table('niveaux')->max('ordre') + 1);

        $id = DB::table('niveaux')->insertGetId([
            'nom_niveau'  => $request->nom_niveau,
            'abbr_niveau' => $request->abbr_niveau,
            'ordre'       => $ordre,
        ]);

        return response()->json(['status' => 'success', 'niveau' => DB::table('niveaux')->where('id', $id)->first()], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nom_niveau'  => 'required|string|unique:niveaux,nom_niveau,' . $id,
            'abbr_niveau' => 'nullable|string',
            'ordre'       => 'nullable|integer|min:1',
        ]);

        DB::table('niveaux')->where('id', $id)->update([
            'nom_niveau'  => $request->nom_niveau,
            'abbr_niveau' => $request->abbr_niveau,
            'ordre'       => $request->ordre ?? DB::table('niveaux')->where('id', $id)->value('ordre'),
        ]);

        return response()->json(['status' => 'success', 'niveau' => DB::table('niveaux')->where('id', $id)->first()]);
    }

    public function destroy($id)
    {
        $nb = DB::table('classes')->where('niveau_id', $id)->count();
        if ($nb > 0) {
            return response()->json([
                'message' => "Impossible de supprimer : {$nb} classe(s) rattachée(s) à ce niveau.",
            ], 422);
        }

        DB::table('niveaux')->where('id', $id)->delete();

        return response()->json(['status' => 'success']);
    }
}
