<?php

namespace App\Http\Controllers\API;

use App\Models\Classe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;

class ClasseController extends Controller
{
    public function index(Request $request)
    {
        $query = Classe::with('niveau');

        if ($request->search) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('nom_classe', 'like', $search)
                  ->orWhere('abbr_classe', 'like', $search);
            });
        }

        if ($request->niveau_id) {
            $query->where('niveau_id', $request->niveau_id);
        }

        return response()->json($query->paginate(10));
    }

    public function listeClasses()
    {
        $touteslesclasses = Classe::all();

        return response()->json($touteslesclasses);
    }

    public function niveauClasse($id)
    {
        $classe = Classe::with('niveau')->find($id);

        return response()->json($classe);
    }

    public function store(Request $request)
    {
        $request->validate([
            'num_classe'  => 'required',
            'nom_classe'  => 'required',
            'abbr_classe' => 'required',
            'niveau_id'   => 'required|exists:niveaux,id',
        ]);

        $classe = Classe::create([
            'num_classe'              => $request->num_classe,
            'nom_classe'              => $request->nom_classe,
            'abbr_classe'             => $request->abbr_classe,
            'niveau_id'               => $request->niveau_id,
            'salle_classe'            => $request->salle_classe,
            'effectif_max_classe'     => $request->effectif_max_classe,
            'professeur_principal_id' => $request->professeur_principal_id ?: null,
        ]);

        return response()->json(['status' => 'success', 'classe' => $classe], 201);
    }

    public function show($id)
    {
        $classe = Classe::with('niveau')->find($id);

        return response()->json($classe);
    }

    public function ChoixNiveau($id)
    {
        $classes_niveau = Classe::where('niveau_id', '=', $id)->get();

        return response()->json($classes_niveau);
    }

    public function ClasseEnseignant($id)
    {
        $enseignants = Classe::with('enseignants')->where('id', '=', $id)->get();

        return response()->json($enseignants);
    }

    /**
     * Retourne les paires matière+enseignant affectées à une classe (avec l'id de la ligne).
     */
    public function classeMatieresEnseignants($id)
    {
        $combos = DB::table('classe_enseignant_matiere')
            ->where('classe_id', $id)
            ->join('enseignants', 'enseignants.id', '=', 'classe_enseignant_matiere.enseignant_id')
            ->join('matieres', 'matieres.id', '=', 'classe_enseignant_matiere.matiere_id')
            ->select(
                'classe_enseignant_matiere.id',
                'classe_enseignant_matiere.enseignant_id',
                'classe_enseignant_matiere.matiere_id',
                'enseignants.nom_enseignant',
                'enseignants.prenoms_enseignant',
                'matieres.libelle_matiere',
                'matieres.abbr_matiere'
            )
            ->get();

        return response()->json($combos);
    }

    /**
     * Retourne les enseignants distincts qui enseignent une matière donnée (dans n'importe quelle classe).
     */
    public function enseignantsParMatiere($id)
    {
        $enseignants = DB::table('classe_enseignant_matiere')
            ->where('matiere_id', $id)
            ->join('enseignants', 'enseignants.id', '=', 'classe_enseignant_matiere.enseignant_id')
            ->select('enseignants.id', 'enseignants.nom_enseignant', 'enseignants.prenoms_enseignant')
            ->distinct()
            ->orderBy('enseignants.nom_enseignant')
            ->get();

        return response()->json($enseignants);
    }

    /**
     * Ajoute une paire matière+enseignant à une classe.
     */
    public function ajouterAffectation(Request $request, $id)
    {
        $request->validate([
            'matiere_id'   => 'required|exists:matieres,id',
            'enseignant_id'=> 'required|exists:enseignants,id',
        ]);

        $existe = DB::table('classe_enseignant_matiere')
            ->where('classe_id',    $id)
            ->where('matiere_id',   $request->matiere_id)
            ->where('enseignant_id',$request->enseignant_id)
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Cette affectation existe déjà.'], 422);
        }

        $rowId = DB::table('classe_enseignant_matiere')->insertGetId([
            'classe_id'     => $id,
            'matiere_id'    => $request->matiere_id,
            'enseignant_id' => $request->enseignant_id,
        ]);

        $row = DB::table('classe_enseignant_matiere')
            ->where('classe_enseignant_matiere.id', $rowId)
            ->join('enseignants', 'enseignants.id', '=', 'classe_enseignant_matiere.enseignant_id')
            ->join('matieres',    'matieres.id',    '=', 'classe_enseignant_matiere.matiere_id')
            ->select(
                'classe_enseignant_matiere.id',
                'classe_enseignant_matiere.enseignant_id',
                'classe_enseignant_matiere.matiere_id',
                'enseignants.nom_enseignant',
                'enseignants.prenoms_enseignant',
                'matieres.libelle_matiere',
                'matieres.abbr_matiere'
            )
            ->first();

        return response()->json($row, 201);
    }

    /**
     * Supprime une paire matière+enseignant d'une classe.
     */
    public function supprimerAffectation($classeId, $affectationId)
    {
        $deleted = DB::table('classe_enseignant_matiere')
            ->where('id', $affectationId)
            ->where('classe_id', $classeId)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Affectation introuvable.'], 404);
        }

        return response()->json(null, 204);
    }

    public function update(Request $request, Classe $classe)
    {
        $request->validate([
            'num_classe'  => 'required',
            'nom_classe'  => 'required',
            'abbr_classe' => 'required',
            'niveau_id'   => 'required|exists:niveaux,id',
        ]);

        $classe->update([
            'num_classe'              => $request->num_classe,
            'nom_classe'              => $request->nom_classe,
            'abbr_classe'             => $request->abbr_classe,
            'niveau_id'               => $request->niveau_id,
            'salle_classe'            => $request->salle_classe,
            'effectif_max_classe'     => $request->effectif_max_classe,
            'professeur_principal_id' => $request->professeur_principal_id ?: null,
        ]);

        return response()->json(['status' => 'success', 'classe' => $classe]);
    }

    public function destroy(Classe $classe)
    {
        $classe->delete();

        return response()->json(['status' => 'success']);
    }
}
