<?php

namespace App\Http\Controllers\API;

use App\Models\CentralUser;
use App\Models\Eleve;
use App\Models\Parents;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Http\Controllers\Controller;

class ParentController extends Controller
{
    public function index(Request $request)
    {
        $query = Parents::query();

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('nom_parent', 'like', $s)
                  ->orWhere('prenom_parent', 'like', $s)
                  ->orWhere('numero_parent', 'like', $s);
            });
        }

        return response()->json($query->orderBy('nom_parent')->paginate(15));
    }

    public function store(Request $request)
    {
        $request->validate([
            'numero_parent' => 'required|string|max:255|unique:parents,numero_parent',
            'nom_parent'    => 'nullable|string|max:255',
            'prenom_parent' => 'nullable|string|max:255',
            'password'      => 'nullable|string|min:4',
            'matricules'    => 'nullable|array',
            'matricules.*'  => 'string',
        ]);

        $mdpProvisoire = $request->filled('password') ? $request->password : Str::random(8);

        $parent = Parents::create([
            'numero_parent'     => $request->numero_parent,
            'nom_parent'        => $request->nom_parent,
            'prenom_parent'     => $request->prenom_parent,
            'password'          => Hash::make($mdpProvisoire),
            'email_parent'      => $request->email_parent,
            'adresse_parent'    => $request->adresse_parent,
            'relation_parent'   => $request->relation_parent,
            'profession_parent' => $request->profession_parent,
        ]);

        $central = CentralUser::lierParent($parent);

        // Associer les élèves par matricule
        if ($request->filled('matricules')) {
            // Vérifier qu'aucun élève n'est déjà rattaché à un autre parent
            $dejaRattaches = Eleve::whereIn('matricule_eleve', $request->matricules)
                ->whereNotNull('parent_id')
                ->pluck('matricule_eleve');

            if ($dejaRattaches->isNotEmpty()) {
                $parent->delete();
                return response()->json([
                    'message' => 'Certains élèves sont déjà rattachés à un autre parent : ' . $dejaRattaches->join(', '),
                    'errors'  => ['matricules' => ['Élève(s) déjà rattaché(s) : ' . $dejaRattaches->join(', ')]],
                ], 422);
            }

            Eleve::whereIn('matricule_eleve', $request->matricules)
                ->update(['parent_id' => $parent->id]);

            foreach ($request->matricules as $matricule) {
                CentralUser::ajouterEnfant($central, tenant('id'), $matricule, 'school_collects');
            }
        }

        $response = $parent->load('eleves')->toArray();
        if (!$request->filled('password')) {
            $response['mot_de_passe_provisoire'] = $mdpProvisoire;
        }
        return response()->json($response, 201);
    }

    public function show(string $id)
    {
        $parent = Parents::with('eleves')->findOrFail($id);
        return response()->json($parent);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'numero_parent' => 'required|string|max:255|unique:parents,numero_parent,' . $id,
            'nom_parent'    => 'nullable|string|max:255',
            'prenom_parent' => 'nullable|string|max:255',
            'password'      => 'nullable|string|min:4',
            'matricules'    => 'nullable|array',
            'matricules.*'  => 'string',
        ]);

        $parent = Parents::findOrFail($id);

        $data = $request->only(['numero_parent', 'nom_parent', 'prenom_parent', 'email_parent', 'adresse_parent', 'relation_parent', 'profession_parent']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }
        $parent->update($data);

        // Dissocier les anciens élèves puis réassocier
        if ($request->has('matricules')) {
            if (!empty($request->matricules)) {
                // Vérifier que les élèves à rattacher n'appartiennent pas à un AUTRE parent
                $dejaRattaches = Eleve::whereIn('matricule_eleve', $request->matricules)
                    ->whereNotNull('parent_id')
                    ->where('parent_id', '!=', $parent->id)
                    ->pluck('matricule_eleve');

                if ($dejaRattaches->isNotEmpty()) {
                    return response()->json([
                        'message' => 'Certains élèves sont déjà rattachés à un autre parent : ' . $dejaRattaches->join(', '),
                        'errors'  => ['matricules' => ['Élève(s) déjà rattaché(s) : ' . $dejaRattaches->join(', ')]],
                    ], 422);
                }
            }

            // Retirer le parent des anciens élèves
            Eleve::where('parent_id', $parent->id)->update(['parent_id' => null]);
            // Affecter les nouveaux
            if (!empty($request->matricules)) {
                Eleve::whereIn('matricule_eleve', $request->matricules)
                    ->update(['parent_id' => $parent->id]);
            }
        }

        return response()->json($parent->load('eleves'));
    }

    public function destroy(string $id)
    {
        $parent = Parents::findOrFail($id);
        // Désassocier les élèves avant suppression
        Eleve::where('parent_id', $parent->id)->update(['parent_id' => null]);
        $parent->delete();
        return response()->json(null, 204);
    }

    public function revoquerTokens(string $id)
    {
        $parent = Parents::findOrFail($id);
        $parent->tokens()->delete();
        return response()->json(['message' => 'Sessions révoquées.']);
    }
}
