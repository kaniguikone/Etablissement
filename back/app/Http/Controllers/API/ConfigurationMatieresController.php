<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConfigurationMatieresController extends Controller
{
    /**
     * Données initiales : toutes les matières, niveaux, séries, groupes alternatifs,
     * config niveau_matieres et classe_matieres actuelles.
     */
    public function index(): JsonResponse
    {
        $matieres = DB::table('matieres')
            ->select('id', 'abbr_matiere', 'libelle_matiere')
            ->orderBy('libelle_matiere')
            ->get();

        $niveaux = DB::table('niveaux')
            ->select('id', 'nom_niveau', 'abbr_niveau')
            ->get();

        $series = DB::table('series')
            ->select('id', 'nom', 'description')
            ->orderBy('nom')
            ->get();

        $classes = DB::table('classes')
            ->select('id', 'abbr_classe', 'nom_classe', 'niveau_id', 'serie_id')
            ->orderBy('niveau_id')
            ->orderBy('serie_id')
            ->orderBy('abbr_classe')
            ->get();

        $groupes = DB::table('groupes_alternatifs')->get();

        // Matières de l'établissement (IDs cochés)
        $etablissementMatieres = DB::table('etablissement_matieres')
            ->pluck('matiere_id');

        // Config actuelle : matières par (niveau_id, serie_id)
        // Clé composite : "niveauId_serieId" (serieId = "null" si pas de série)
        $niveauMatieres = DB::table('niveau_matieres')->get()
            ->groupBy(fn($r) => $r->niveau_id . '_' . ($r->serie_id ?? 'null'))
            ->map(fn($rows) => $rows->map(fn($r) => [
                'matiere_id'           => $r->matiere_id,
                'obligatoire'          => (bool) $r->obligatoire,
                'coefficient'          => (float) ($r->coefficient ?? 1),
                'groupe_alternatif_id' => $r->groupe_alternatif_id,
            ])->values());

        // Config actuelle : matières alternatives résolues par classe
        $classeMatieres = DB::table('classe_matieres')->get()
            ->groupBy('classe_id')
            ->map(fn($rows) => $rows->map(fn($r) => [
                'matiere_id'           => $r->matiere_id,
                'groupe_alternatif_id' => $r->groupe_alternatif_id,
            ])->values());

        return response()->json(compact(
            'matieres', 'niveaux', 'series', 'classes', 'groupes',
            'etablissementMatieres', 'niveauMatieres', 'classeMatieres'
        ));
    }

    /**
     * Sauvegarde des matières enseignées dans l'établissement.
     */
    public function saveEtablissement(Request $request): JsonResponse
    {
        $request->validate([
            'matiere_ids'   => 'present|array',
            'matiere_ids.*' => 'integer|exists:matieres,id',
        ]);

        try {
            DB::transaction(function () use ($request) {
                DB::table('etablissement_matieres')->delete();
                foreach ($request->matiere_ids as $matiereId) {
                    DB::table('etablissement_matieres')->insert([
                        'matiere_id' => $matiereId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Échec de la sauvegarde. Aucune modification enregistrée.'], 500);
        }

        return response()->json(['message' => 'Matières de l\'établissement sauvegardées.']);
    }

    /**
     * Séries — CRUD
     */
    public function storeSerie(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom'         => 'required|string|max:20',
            'description' => 'nullable|string|max:100',
        ]);
        $id = DB::table('series')->insertGetId([
            'nom'         => $data['nom'],
            'description' => $data['description'] ?? null,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
        return response()->json(DB::table('series')->find($id), 201);
    }

    public function updateSerie(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'nom'         => 'required|string|max:20',
            'description' => 'nullable|string|max:100',
        ]);
        DB::table('series')->where('id', $id)->update([
            'nom'         => $data['nom'],
            'description' => $data['description'] ?? null,
            'updated_at'  => now(),
        ]);
        return response()->json(DB::table('series')->find($id));
    }

    public function destroySerie(int $id): JsonResponse
    {
        DB::table('series')->where('id', $id)->delete();
        return response()->json(null, 204);
    }

    /**
     * Groupes alternatifs — CRUD
     */
    public function storeGroupe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom'         => 'required|string|max:50',
            'description' => 'nullable|string|max:200',
        ]);
        $id = DB::table('groupes_alternatifs')->insertGetId([
            'nom'         => $data['nom'],
            'description' => $data['description'] ?? null,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
        return response()->json(DB::table('groupes_alternatifs')->find($id), 201);
    }

    public function updateGroupe(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'nom'         => 'required|string|max:50',
            'description' => 'nullable|string|max:200',
        ]);
        DB::table('groupes_alternatifs')->where('id', $id)->update([
            'nom'         => $data['nom'],
            'description' => $data['description'] ?? null,
            'updated_at'  => now(),
        ]);
        return response()->json(DB::table('groupes_alternatifs')->find($id));
    }

    public function destroyGroupe(int $id): JsonResponse
    {
        DB::table('groupes_alternatifs')->where('id', $id)->delete();
        return response()->json(null, 204);
    }

    /**
     * Sauvegarde de la configuration d'un niveau+série.
     * Body: { serie_id: int|null, matieres: [{matiere_id, obligatoire, groupe_alternatif_id|null}] }
     */
    public function saveNiveau(Request $request, int $niveauId): JsonResponse
    {
        $request->validate([
            'serie_id'                        => 'nullable|integer|exists:series,id',
            'matieres'                        => 'present|array',
            'matieres.*.matiere_id'           => 'required|integer|exists:matieres,id',
            'matieres.*.obligatoire'          => 'required|boolean',
            'matieres.*.coefficient'          => 'nullable|numeric|min:0.5|max:20',
            'matieres.*.groupe_alternatif_id' => 'nullable|integer|exists:groupes_alternatifs,id',
        ]);

        $serieId = $request->serie_id ?? null;

        try {
            DB::transaction(function () use ($request, $niveauId, $serieId) {
                DB::table('niveau_matieres')
                    ->where('niveau_id', $niveauId)
                    ->where('serie_id', $serieId)
                    ->delete();

                foreach ($request->matieres as $m) {
                    DB::table('niveau_matieres')->insert([
                        'niveau_id'            => $niveauId,
                        'serie_id'             => $serieId,
                        'matiere_id'           => $m['matiere_id'],
                        'obligatoire'          => $m['obligatoire'] ? 1 : 0,
                        'coefficient'          => $m['coefficient'] ?? 1,
                        'groupe_alternatif_id' => $m['groupe_alternatif_id'] ?? null,
                        'created_at'           => now(),
                        'updated_at'           => now(),
                    ]);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Échec de la sauvegarde du niveau. Aucune modification enregistrée.'], 500);
        }

        return response()->json(['message' => 'Configuration sauvegardée.']);
    }

    /**
     * Sauvegarde du choix alternatif pour une classe.
     */
    public function saveClasse(Request $request, int $classeId): JsonResponse
    {
        $request->validate([
            'resolutions'                        => 'present|array',
            'resolutions.*.groupe_alternatif_id' => 'required|integer|exists:groupes_alternatifs,id',
            'resolutions.*.matiere_id'           => 'required|integer|exists:matieres,id',
        ]);

        try {
            DB::transaction(function () use ($request, $classeId) {
                DB::table('classe_matieres')->where('classe_id', $classeId)->delete();

                foreach ($request->resolutions as $r) {
                    DB::table('classe_matieres')->insert([
                        'classe_id'            => $classeId,
                        'matiere_id'           => $r['matiere_id'],
                        'groupe_alternatif_id' => $r['groupe_alternatif_id'],
                        'created_at'           => now(),
                        'updated_at'           => now(),
                    ]);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Échec de la sauvegarde de la classe. Aucune modification enregistrée.'], 500);
        }

        return response()->json(['message' => 'Choix de la classe sauvegardé.']);
    }
}
