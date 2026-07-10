<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CentralUser;
use App\Models\Classe;
use App\Models\Enseignant;
use App\Models\Matiere;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnseignantController extends Controller
{
    public function index(Request $request)
    {
        $query = Enseignant::with('matieres', 'classes');

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('nom_enseignant', 'like', $s)
                  ->orWhere('prenoms_enseignant', 'like', $s)
                  ->orWhere('matricule_enseignant', 'like', $s);
            });
        }

        return response()->json($query->orderBy('nom_enseignant')->paginate(10));
    }

    public function listeEnseignants()
    {
        $touslesenseignants = Enseignant::all();

        return response()->json($touslesenseignants);
    }

    public function enseignantClasse($id)
    {
        $enseignants = Enseignant::with(['classes', 'matieres'])
            ->whereHas('classes', fn($q) => $q->where('classes.id', $id))
            ->get();

        return response()->json($enseignants);
    }

    public function store(Request $request)
    {
        $request->validate([
            'matricule_enseignant' => 'required',
            'nom_enseignant'       => 'required',
            'prenoms_enseignant'   => 'required',
        ]);

        $enseignant = Enseignant::create([
            'matricule_enseignant'     => $request->matricule_enseignant,
            'nom_enseignant'           => $request->nom_enseignant,
            'prenoms_enseignant'       => $request->prenoms_enseignant,
            'genre_enseignant'         => $request->genre_enseignant,
            'telephone_enseignant'     => $request->telephone_enseignant,
            'email_enseignant'         => $request->email_enseignant,
            'date_naissance_enseignant'=> $request->date_naissance_enseignant ?: null,
            'date_embauche_enseignant' => $request->date_embauche_enseignant ?: null,
            'statut_enseignant'        => $request->statut_enseignant,
            'password'                 => $request->filled('password') ? $request->password : null,
        ]);

        if ($enseignant->telephone_enseignant && $enseignant->password) {
            CentralUser::lierEnseignant($enseignant, tenant('id'));
        }

        return response()->json(['status' => 'success', 'enseignant' => $enseignant], 201);
    }

    public function show($id)
    {
        $enseignant = Enseignant::with('matieres', 'classes')->find($id);

        return response()->json($enseignant);
    }

    public function update(Request $request, Enseignant $enseignant)
    {
        $request->validate([
            'matricule_enseignant' => 'required',
            'nom_enseignant'       => 'required',
            'prenoms_enseignant'   => 'required',
        ]);

        $data = [
            'matricule_enseignant'     => $request->matricule_enseignant,
            'nom_enseignant'           => $request->nom_enseignant,
            'prenoms_enseignant'       => $request->prenoms_enseignant,
            'genre_enseignant'         => $request->genre_enseignant,
            'telephone_enseignant'     => $request->telephone_enseignant,
            'email_enseignant'         => $request->email_enseignant,
            'date_naissance_enseignant'=> $request->date_naissance_enseignant ?: null,
            'date_embauche_enseignant' => $request->date_embauche_enseignant ?: null,
            'statut_enseignant'        => $request->statut_enseignant,
        ];

        if ($request->filled('password')) {
            $data['password'] = $request->password;
        }

        $enseignant->update($data);

        return response()->json(['status' => 'success', 'enseignant' => $enseignant]);
    }

    public function destroy(Enseignant $enseignant)
    {
        $enseignant->delete();

        return response()->json(['status' => 'success']);
    }

    public function affectations($id)
    {
        $rows = DB::table('classe_enseignant_matiere')
            ->where('enseignant_id', $id)
            ->join('classes',  'classes.id',  '=', 'classe_enseignant_matiere.classe_id')
            ->join('matieres', 'matieres.id', '=', 'classe_enseignant_matiere.matiere_id')
            ->select(
                'classe_enseignant_matiere.id',
                'classe_enseignant_matiere.classe_id',
                'classe_enseignant_matiere.matiere_id',
                'classes.nom_classe',
                'classes.abbr_classe',
                'matieres.libelle_matiere',
                'matieres.abbr_matiere'
            )
            ->orderBy('classes.nom_classe')
            ->orderBy('matieres.libelle_matiere')
            ->get();

        $classes  = Classe::orderBy('nom_classe')->get(['id', 'nom_classe', 'abbr_classe']);
        $matieres = Matiere::orderBy('libelle_matiere')->get(['id', 'libelle_matiere', 'abbr_matiere']);

        return response()->json([
            'affectations' => $rows,
            'classes'      => $classes,
            'matieres'     => $matieres,
        ]);
    }

    public function sauvegarderAffectations(Request $request, $id)
    {
        $request->validate([
            'affectations'               => 'required|array',
            'affectations.*.classe_id'   => 'required|integer|exists:classes,id',
            'affectations.*.matiere_id'  => 'required|integer|exists:matieres,id',
        ]);

        // Vérifier les contraintes métier
        $classeIds  = array_unique(array_column($request->affectations, 'classe_id'));
        $matiereIds = array_unique(array_column($request->affectations, 'matiere_id'));

        if (count($matiereIds) > 3) {
            return response()->json(['message' => 'Un enseignant ne peut pas enseigner plus de 3 matières différentes.'], 422);
        }
        if (count($classeIds) > 7) {
            return response()->json(['message' => 'Un enseignant ne peut pas avoir plus de 7 classes.'], 422);
        }

        // Remplacer toutes les affectations de cet enseignant
        DB::table('classe_enseignant_matiere')->where('enseignant_id', $id)->delete();

        $rows = array_map(fn($a) => [
            'enseignant_id' => (int) $id,
            'classe_id'     => $a['classe_id'],
            'matiere_id'    => $a['matiere_id'],
        ], $request->affectations);

        if (!empty($rows)) {
            DB::table('classe_enseignant_matiere')->insert($rows);
        }

        return response()->json(['status' => 'success']);
    }

    public function revoquerTokens(string $id)
    {
        $enseignant = Enseignant::findOrFail($id);
        $enseignant->tokens()->delete();
        return response()->json(['message' => 'Sessions révoquées.']);
    }
}
