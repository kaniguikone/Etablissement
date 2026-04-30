<?php

namespace App\Http\Controllers\API;

use App\Models\Classe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;

class ClasseController extends Controller
{
    // ── CRUD ─────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = Classe::with('niveau', 'serie');

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

    public function show($id)
    {
        return response()->json(Classe::with('niveau', 'serie')->find($id));
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
            'serie_id'                => $request->serie_id ?: null,
            'salle_classe'            => $request->salle_classe,
            'effectif_max_classe'     => $request->effectif_max_classe,
            'professeur_principal_id' => $request->professeur_principal_id ?: null,
        ]);

        return response()->json(['status' => 'success', 'classe' => $classe], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'num_classe'  => 'required',
            'nom_classe'  => 'required',
            'abbr_classe' => 'required',
            'niveau_id'   => 'required|exists:niveaux,id',
        ]);

        DB::table('classes')->where('id', $id)->update([
            'num_classe'              => $request->num_classe,
            'nom_classe'              => $request->nom_classe,
            'abbr_classe'             => $request->abbr_classe,
            'niveau_id'               => $request->niveau_id,
            'serie_id'                => $request->serie_id ?: null,
            'salle_classe'            => $request->salle_classe,
            'effectif_max_classe'     => $request->effectif_max_classe ?: null,
            'professeur_principal_id' => $request->professeur_principal_id ?: null,
        ]);

        return response()->json(['status' => 'success', 'classe' => DB::table('classes')->where('id', $id)->first()]);
    }

    public function destroy($id)
    {
        DB::table('classes')->where('id', $id)->delete();

        return response()->json(['status' => 'success']);
    }

    // ── Lookups ───────────────────────────────────────────────────────────────

    /** Toutes les classes sans pagination. */
    public function listeClasses()
    {
        return response()->json(Classe::all());
    }

    /** Classes d'un niveau donné. */
    public function ChoixNiveau($id)
    {
        return response()->json(Classe::where('niveau_id', $id)->get());
    }

    /** Classe avec son niveau. */
    public function niveauClasse($id)
    {
        return response()->json(Classe::with('niveau')->find($id));
    }

    // ── Enseignants d'une classe ──────────────────────────────────────────────

    /** Enseignants affectés à une classe (relation many-to-many). */
    public function ClasseEnseignant($id)
    {
        return response()->json(Classe::with('enseignants')->where('id', $id)->get());
    }

    // ── Affectations matière-enseignant ───────────────────────────────────────

    /** Paires matière+enseignant d'une classe avec détails. */
    public function classeMatieresEnseignants($id)
    {
        $combos = DB::table('classe_enseignant_matiere')
            ->where('classe_id', $id)
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
            ->get();

        return response()->json($combos);
    }

    /** Ajoute une paire matière+enseignant à une classe. */
    public function ajouterAffectation(Request $request, $id)
    {
        $request->validate([
            'matiere_id'    => 'required|exists:matieres,id',
            'enseignant_id' => 'required|exists:enseignants,id',
        ]);

        $existe = DB::table('classe_enseignant_matiere')
            ->where('classe_id',     $id)
            ->where('matiere_id',    $request->matiere_id)
            ->where('enseignant_id', $request->enseignant_id)
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

    /** Supprime une paire matière+enseignant d'une classe. */
    public function supprimerAffectation($classeId, $affectationId)
    {
        $deleted = DB::table('classe_enseignant_matiere')
            ->where('id',       $affectationId)
            ->where('classe_id', $classeId)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Affectation introuvable.'], 404);
        }

        return response()->json(null, 204);
    }

    // ── Vues croisées enseignants / matières ──────────────────────────────────

    /** Enseignants distincts qui enseignent une matière donnée. */
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

    /** Toutes les matières avec leurs enseignants et les classes associées. */
    public function profsParMatieres()
    {
        $matieres = DB::table('matieres')->orderBy('libelle_matiere')->get();

        $affectations = DB::table('classe_enseignant_matiere')
            ->join('enseignants', 'enseignants.id', '=', 'classe_enseignant_matiere.enseignant_id')
            ->join('classes',     'classes.id',     '=', 'classe_enseignant_matiere.classe_id')
            ->select(
                'classe_enseignant_matiere.matiere_id',
                'enseignants.id as enseignant_id',
                'enseignants.nom_enseignant',
                'enseignants.prenoms_enseignant',
                'classes.nom_classe'
            )
            ->get()
            ->groupBy('matiere_id');

        $result = $matieres->map(function ($matiere) use ($affectations) {
            $aff = $affectations->get($matiere->id, collect());

            $enseignants = $aff->groupBy('enseignant_id')->map(function ($rows) {
                $first = $rows->first();
                return [
                    'id'                 => $first->enseignant_id,
                    'nom_enseignant'     => $first->nom_enseignant,
                    'prenoms_enseignant' => $first->prenoms_enseignant,
                    'classes'            => $rows->pluck('nom_classe')->unique()->sort()->values(),
                ];
            })->sortBy('nom_enseignant')->values();

            return [
                'id'              => $matiere->id,
                'abbr_matiere'    => $matiere->abbr_matiere,
                'libelle_matiere' => $matiere->libelle_matiere,
                'enseignants'     => $enseignants,
            ];
        });

        return response()->json($result);
    }
}
