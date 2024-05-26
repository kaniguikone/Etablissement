<?php

namespace App\Http\Controllers\API;

use App\Models\Eleve;
use App\Models\Classe;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class EleveController extends Controller
{
    public function listeEleves()
    {
        $tousleseleves = Eleve::all();
        
        return response()->json($tousleseleves);
    }

    public function ElevesNiveau($id)
    {
        $classes = Classe::where('niveau_id', '=', $id)->get('id');
        
        $eleves_niveau = Eleve::with('classe')->whereIn('classe_id', $classes)->orderBy('id')->paginate(15);

        return response()->json($eleves_niveau);
    }

    public function ElevesClasse ($id)
    {
        $eleves_classe = Eleve::with('classe')->where('classe_id', '=', $id)->paginate(15);

        return response()->json($eleves_classe);
    }

    public function index()
    {
        $eleves = Eleve::with('classe')->paginate(15);
        
        return response()->json($eleves);
    }

    public function store(Request $request)
    {
        $request->validate([
            'matricule_eleve' => "required",
            'nom_eleve' => "required",
            'prenoms_eleve' => "required",
            'date_naissance_eleve' => "required",
            'classe_id' => "required"
        ]);

        $eleve = Eleve::create([
            'matricule_eleve' => $request->matricule_eleve,
            'nom_eleve' => $request->nom_eleve,
            'prenoms_eleve' => $request->prenoms_eleve,
            'date_naissance_eleve' => $request->date_naissance_eleve,
            'classe_id' => $request->classe_id
        ]); 

        return response()->json([
            'status' => 'success',
            'eleve'   => $eleve
        ]);
    }

    public function show($id)
    {
        //$eleve = Eleve::where('id', '=', $id)->get();
        
        $eleve = Eleve::with('classe')->find($id);
     
        return response()->json($eleve);
    }

    public function update(Request $request, Eleve $eleve)
    {
        //
    }

    public function destroy(Eleve $eleve)
    {
        //
    }

}
