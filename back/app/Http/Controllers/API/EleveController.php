<?php

namespace App\Http\Controllers\API;

use App\Models\Eleve;
use App\Models\Classe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\Controller;

class EleveController extends Controller
{
    public function listeEleves()
    {
        $eleves = Eleve::select('id', 'matricule_eleve', 'nom_eleve', 'prenoms_eleve', 'classe_id', 'statut_eleve')
            ->with('classe:id,nom_classe,abbr_classe')
            ->orderBy('nom_eleve')
            ->get();

        return response()->json($eleves);
    }

    public function ElevesNiveau($id)
    {
        $classes = Classe::where('niveau_id', '=', $id)->get('id');

        $eleves_niveau = Eleve::with('classe')->whereIn('classe_id', $classes)->orderBy('id')->paginate(15);

        return response()->json($eleves_niveau);
    }

    public function ElevesClasse($id)
    {
        $eleves_classe = Eleve::with('classe')->where('classe_id', '=', $id)->paginate(15);

        return response()->json($eleves_classe);
    }

    public function ElevesParent($id)
    {
        $eleves_parent = Eleve::with('classe')->where('parent_id', '=', $id)->get();

        return response()->json($eleves_parent);
    }

    public function index(Request $request)
    {
        $query = Eleve::with('classe');

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('nom_eleve', 'like', $s)
                  ->orWhere('prenoms_eleve', 'like', $s)
                  ->orWhere('matricule_eleve', 'like', $s);
            });
        }

        return response()->json($query->orderBy('nom_eleve')->paginate(15));
    }

    public function store(Request $request)
    {
        $request->validate([
            'matricule_eleve'      => 'required|string|max:50|unique:eleves,matricule_eleve',
            'nom_eleve'            => 'required|string|max:100',
            'prenoms_eleve'        => 'required|string|max:150',
            'date_naissance_eleve' => 'required|date',
            'classe_id'            => 'required|exists:classes,id',
            'parent_id'            => 'nullable|exists:parents,id',
            'photo_eleve'          => 'nullable|image|max:2048',
            'langue2'              => 'nullable|in:espagnol,allemand,autre',
            'statut_bourse'        => 'nullable|in:non_boursier,demi_boursier,boursier',
            'est_affecte'          => 'nullable|boolean',
            'types_handicap'       => 'nullable|array',
            'types_handicap.*'     => 'in:moteur,malvoyant,malentendant,albinisme,nanisme,begayement,autiste',
            'statut_orphelin'      => 'nullable|in:pere,mere,les_deux',
        ]);

        $estAffecte   = $request->boolean('est_affecte');
        $statutBourse = $estAffecte ? ($request->input('statut_bourse') ?: 'non_boursier') : 'non_boursier';

        $photoPath = null;
        if ($request->hasFile('photo_eleve')) {
            try {
                $photoPath = $request->file('photo_eleve')->store('photos/eleves', 'public');
                if (!$photoPath) throw new \RuntimeException('Stockage échoué.');
            } catch (\Throwable $e) {
                return response()->json(['message' => 'Impossible de sauvegarder la photo. Vérifiez l\'espace disque.'], 500);
            }
        }

        $eleve = Eleve::create([
            'matricule_eleve'      => $request->matricule_eleve,
            'nom_eleve'            => $request->nom_eleve,
            'prenoms_eleve'        => $request->prenoms_eleve,
            'date_naissance_eleve' => $request->date_naissance_eleve,
            'genre_eleve'          => $request->genre_eleve,
            'lieu_naissance_eleve' => $request->lieu_naissance_eleve,
            'nationalite_eleve'    => $request->nationalite_eleve,
            'adresse_eleve'        => $request->adresse_eleve,
            'photo_eleve'          => $photoPath,
            'classe_id'            => $request->classe_id,
            'parent_id'            => $request->parent_id,
            'langue2'              => $request->langue2 ?: null,
            'statut_bourse'        => $statutBourse,
            'est_affecte'          => $estAffecte,
            'types_handicap'       => $request->input('types_handicap') ?: null,
            'statut_orphelin'      => $request->statut_orphelin ?: null,
        ]);

        return response()->json(['status' => 'success', 'eleve' => $eleve], 201);
    }

    public function show($id)
    {
        return response()->json(Eleve::with('classe')->findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'matricule_eleve'      => "required|string|max:50|unique:eleves,matricule_eleve,{$id}",
            'nom_eleve'            => 'required|string|max:100',
            'prenoms_eleve'        => 'required|string|max:150',
            'date_naissance_eleve' => 'required|date',
            'classe_id'            => 'required|exists:classes,id',
            'parent_id'            => 'nullable|exists:parents,id',
            'photo_eleve'          => 'nullable|image|max:2048',
            'statut_eleve'         => 'nullable|in:actif,inactif,abandon,decede',
            'langue2'              => 'nullable|in:espagnol,allemand,autre',
            'statut_bourse'        => 'nullable|in:non_boursier,demi_boursier,boursier',
            'est_affecte'          => 'nullable|boolean',
            'types_handicap'       => 'nullable|array',
            'types_handicap.*'     => 'in:moteur,malvoyant,malentendant,albinisme,nanisme,begayement,autiste',
            'statut_orphelin'      => 'nullable|in:pere,mere,les_deux',
        ]);

        $eleve = Eleve::findOrFail($id);

        $estAffecte   = $request->boolean('est_affecte');
        $statutBourse = $estAffecte ? ($request->input('statut_bourse') ?: 'non_boursier') : 'non_boursier';

        $data = [
            'matricule_eleve'      => $request->matricule_eleve,
            'nom_eleve'            => $request->nom_eleve,
            'prenoms_eleve'        => $request->prenoms_eleve,
            'date_naissance_eleve' => $request->date_naissance_eleve,
            'genre_eleve'          => $request->genre_eleve,
            'lieu_naissance_eleve' => $request->lieu_naissance_eleve,
            'nationalite_eleve'    => $request->nationalite_eleve,
            'adresse_eleve'        => $request->adresse_eleve,
            'classe_id'            => $request->classe_id,
            'parent_id'            => $request->parent_id,
            'statut_eleve'         => $request->statut_eleve ?? $eleve->statut_eleve,
            'langue2'              => $request->langue2 ?: null,
            'statut_bourse'        => $statutBourse,
            'est_affecte'          => $estAffecte,
            'types_handicap'       => $request->input('types_handicap') ?: null,
            'statut_orphelin'      => $request->statut_orphelin ?: null,
        ];

        if ($request->hasFile('photo_eleve')) {
            try {
                $newPath = $request->file('photo_eleve')->store('photos/eleves', 'public');
                if (!$newPath) throw new \RuntimeException('Stockage échoué.');
                if ($eleve->photo_eleve) {
                    Storage::disk('public')->delete($eleve->photo_eleve);
                }
                $data['photo_eleve'] = $newPath;
            } catch (\Throwable $e) {
                return response()->json(['message' => 'Impossible de sauvegarder la photo. Vérifiez l\'espace disque.'], 500);
            }
        }

        $eleve->update($data);

        return response()->json(['status' => 'success', 'eleve' => $eleve]);
    }

    public function updatePhoto(Request $request, string $id)
    {
        $request->validate([
            'photo_eleve' => 'required|image|max:2048',
        ]);

        $eleve = Eleve::findOrFail($id);

        try {
            $path = $request->file('photo_eleve')->store('photos/eleves', 'public');
            if (!$path) throw new \RuntimeException('Stockage échoué.');
            if ($eleve->photo_eleve) {
                Storage::disk('public')->delete($eleve->photo_eleve);
            }
            $eleve->update(['photo_eleve' => $path]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Impossible de sauvegarder la photo. Vérifiez l\'espace disque.'], 500);
        }

        return response()->json([
            'status'    => 'success',
            'photo_url' => $eleve->photo_url,
        ]);
    }

    public function destroy(string $id)
    {
        $eleve = Eleve::findOrFail($id);
        if ($eleve->photo_eleve) {
            Storage::disk('public')->delete($eleve->photo_eleve);
        }
        $eleve->delete();

        return response()->json(['status' => 'success']);
    }

    /**
     * Export CSV de la liste des élèves.
     * Filtres: classe_id, niveau_id, search
     */
    public function exportCsv(Request $request)
    {
        $query = Eleve::with('classe.niveau');

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('nom_eleve', 'like', $s)
                  ->orWhere('prenoms_eleve', 'like', $s)
                  ->orWhere('matricule_eleve', 'like', $s);
            });
        }

        if ($request->filled('classe_id')) {
            $query->where('classe_id', $request->classe_id);
        }

        if ($request->filled('niveau_id')) {
            $query->whereHas('classe', fn($q) => $q->where('niveau_id', $request->niveau_id));
        }

        $eleves   = $query->orderBy('nom_eleve')->get();
        $filename = 'eleves_' . date('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($eleves) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel
            fputcsv($handle, [
                'Matricule', 'Nom', 'Prénoms', 'Sexe',
                'Date de naissance', 'Lieu de naissance', 'Nationalité',
                'Classe', 'Niveau', 'Adresse',
            ], ';');
            foreach ($eleves as $e) {
                fputcsv($handle, [
                    $e->matricule_eleve,
                    $e->nom_eleve,
                    $e->prenoms_eleve,
                    $e->genre_eleve,
                    $e->date_naissance_eleve,
                    $e->lieu_naissance_eleve,
                    $e->nationalite_eleve,
                    $e->classe?->nom_classe,
                    $e->classe?->niveau?->libelle_niveau,
                    $e->adresse_eleve,
                ], ';');
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
