<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\EdtGeneration;
use App\Models\EmploiDuTemps;
use App\Models\PlageHoraire;
use App\Services\Edt\Generateur;
use App\Services\Edt\Validateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Génération automatique d'emplois du temps (chantier EDT — Lot 2).
 *
 * La génération est synchrone : pour un collège elle dure quelques secondes.
 * Un passage en file d'attente pourra être ajouté si les gros lycées le
 * justifient (le moteur et la persistance ne changeront pas).
 */
class EdtGenerationController extends Controller
{
    public function index()
    {
        return response()->json(
            EdtGeneration::withCount('creneaux')->orderByDesc('id')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'libelle' => 'nullable|string|max:120',
            'jours' => 'nullable|array',
            'jours.*' => 'in:lundi,mardi,mercredi,jeudi,vendredi,samedi',
            'classe_ids' => 'nullable|array',
            'classe_ids.*' => 'integer|exists:classes,id',
        ]);

        $params = [
            'jours' => $data['jours'] ?? ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
            'classe_ids' => $data['classe_ids'] ?? null,
        ];

        $generation = EdtGeneration::create([
            'libelle' => $data['libelle'] ?? ('Scénario du '.now()->format('d/m/Y H:i')),
            'annee_scolaire_id' => AnneeScolaire::courante()?->id,
            'statut' => 'en_cours',
            'parametres' => $params,
            'created_by' => $request->user()?->id,
        ]);

        @ini_set('max_execution_time', '300');
        $depart = microtime(true);

        try {
            $resultat = (new Generateur)->generer($params);

            $this->persisterCreneaux($generation, $resultat['creneaux']);

            $generation->update([
                'statut' => 'termine',
                'score' => $resultat['score'],
                'diagnostic' => $resultat['diagnostic'],
                'duree_ms' => (int) round((microtime(true) - $depart) * 1000),
            ]);
        } catch (\Throwable $e) {
            $generation->update(['statut' => 'echec', 'diagnostic' => ['erreur' => $e->getMessage()]]);

            return response()->json(['message' => 'La génération a échoué.', 'detail' => $e->getMessage()], 500);
        }

        return response()->json($this->details($generation->fresh()), 201);
    }

    public function show(int $id)
    {
        return response()->json($this->details(EdtGeneration::findOrFail($id)));
    }

    /**
     * Régénère à partir d'un scénario en conservant ses créneaux verrouillés.
     * Crée un nouveau scénario.
     */
    public function regenerer(Request $request, int $id)
    {
        $source = EdtGeneration::findOrFail($id);

        $fixes = EmploiDuTemps::withoutGlobalScope('officiel')
            ->where('generation_id', $source->id)->where('verrouille', true)
            ->get(['classe_id', 'matiere_id', 'enseignant_id', 'salle_id', 'plage_horaire_id', 'jour', 'heure_debut', 'heure_fin'])
            ->map(fn ($c) => $c->toArray())->all();

        $params = ($source->parametres ?? []) + ['jours' => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']];
        $params['creneaux_fixes'] = $fixes;

        $generation = EdtGeneration::create([
            'libelle' => $request->input('libelle') ?: ($source->libelle.' (régénéré)'),
            'annee_scolaire_id' => $source->annee_scolaire_id,
            'statut' => 'en_cours',
            'parametres' => \Illuminate\Support\Arr::except($params, ['creneaux_fixes']),
            'created_by' => $request->user()?->id,
        ]);

        @ini_set('max_execution_time', '300');
        $depart = microtime(true);
        try {
            $resultat = (new Generateur)->generer($params);
            $this->persisterCreneaux($generation, $resultat['creneaux']);
            $generation->update([
                'statut' => 'termine',
                'score' => $resultat['score'],
                'diagnostic' => $resultat['diagnostic'],
                'duree_ms' => (int) round((microtime(true) - $depart) * 1000),
            ]);
        } catch (\Throwable $e) {
            $generation->update(['statut' => 'echec', 'diagnostic' => ['erreur' => $e->getMessage()]]);

            return response()->json(['message' => 'La régénération a échoué.'], 500);
        }

        return response()->json($this->details($generation->fresh()), 201);
    }

    /**
     * Déplace / verrouille / réaffecte un créneau d'un scénario.
     * PATCH /edt/generations/{id}/creneaux/{creneauId}
     */
    public function patchCreneau(Request $request, int $id, int $creneauId)
    {
        $creneau = EmploiDuTemps::withoutGlobalScope('officiel')
            ->where('generation_id', $id)->findOrFail($creneauId);

        $data = $request->validate([
            'jour' => 'sometimes|in:lundi,mardi,mercredi,jeudi,vendredi,samedi',
            'plage_horaire_id' => 'sometimes|exists:plages_horaires,id',
            'salle_id' => 'sometimes|nullable|exists:salles,id',
            'enseignant_id' => 'sometimes|exists:enseignants,id',
            'verrouille' => 'sometimes|boolean',
        ]);

        if (array_key_exists('plage_horaire_id', $data)) {
            $plage = PlageHoraire::find($data['plage_horaire_id']);
            if ($plage) {
                $data['heure_debut'] = substr($plage->heure_debut, 0, 5);
                $data['heure_fin'] = substr($plage->heure_fin, 0, 5);
            }
        }

        // Vérifie que le déplacement n'introduit pas de nouveau conflit bloquant.
        $avant = $this->controleScenario($id);
        $creneau->fill($data)->save();
        $apres = $this->controleScenario($id);

        if ($apres['nb_dures'] > $avant['nb_dures'] && ! $request->boolean('forcer')) {
            $creneau->refresh(); // (déjà sauvé) — on renvoie l'info, le front peut forcer
            $nouvelles = collect($apres['violations'])->where('nature', 'dure')
                ->pluck('message')->diff(collect($avant['violations'])->where('nature', 'dure')->pluck('message'))->values();

            return response()->json([
                'message' => 'Ce déplacement crée un conflit bloquant.',
                'conflits' => $nouvelles,
                'applique' => true,
            ], 200);
        }

        return response()->json($creneau->fresh()->load(['matiere:id,libelle_matiere,abbr_matiere,couleur', 'enseignant:id,nom_enseignant', 'salle:id,nom']));
    }

    public function destroyCreneau(int $id, int $creneauId)
    {
        EmploiDuTemps::withoutGlobalScope('officiel')
            ->where('generation_id', $id)->findOrFail($creneauId)->delete();

        return response()->json(null, 204);
    }

    public function destroy(int $id)
    {
        $generation = EdtGeneration::findOrFail($id);
        if ($generation->statut === 'publie') {
            return response()->json(['message' => 'Un scénario publié ne peut pas être supprimé.'], 422);
        }
        EmploiDuTemps::withoutGlobalScope('officiel')->where('generation_id', $id)->delete();
        $generation->delete();

        return response()->json(null, 204);
    }

    /**
     * Promeut le scénario en emploi du temps officiel : l'EDT courant est
     * archivé, les créneaux du scénario repassent à generation_id = NULL.
     */
    public function publier(int $id, \App\Services\NotificationService $notifications)
    {
        $generation = EdtGeneration::findOrFail($id);
        if ($generation->statut === 'publie') {
            return response()->json(['message' => 'Scénario déjà publié.'], 422);
        }

        DB::transaction(function () use ($generation) {
            $officielExistant = EmploiDuTemps::whereNotNull('id')->count(); // scope officiel = generation_id NULL

            if ($officielExistant > 0) {
                $archive = EdtGeneration::create([
                    'libelle' => 'Archive du '.now()->format('d/m/Y H:i'),
                    'annee_scolaire_id' => $generation->annee_scolaire_id,
                    'statut' => 'archive',
                ]);
                EmploiDuTemps::query()->update(['generation_id' => $archive->id]);
            }

            EmploiDuTemps::withoutGlobalScope('officiel')
                ->where('generation_id', $generation->id)
                ->update(['generation_id' => null]);

            EdtGeneration::where('statut', 'publie')->update(['statut' => 'archive']);
            $generation->update(['statut' => 'publie']);
        });

        // Notifie les enseignants concernés (silencieux en cas d'échec).
        try {
            $enseignantIds = EmploiDuTemps::query()->distinct()->pluck('enseignant_id')->filter();
            foreach ($enseignantIds as $eid) {
                $notifications->notifierEnseignant(
                    (int) $eid, 'edt_publie', 'Emploi du temps mis à jour',
                    'Un nouvel emploi du temps vient d\'être publié. Consultez « Mon emploi du temps ».',
                    ['generation_id' => $generation->id],
                );
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['message' => 'Emploi du temps publié.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private function persisterCreneaux(EdtGeneration $generation, array $creneaux): void
    {
        DB::transaction(function () use ($creneaux, $generation) {
            foreach (array_chunk($creneaux, 200) as $lot) {
                EmploiDuTemps::insert(array_map(fn ($c) => [
                    'classe_id' => $c['classe_id'],
                    'matiere_id' => $c['matiere_id'],
                    'enseignant_id' => $c['enseignant_id'],
                    'salle_id' => $c['salle_id'],
                    'plage_horaire_id' => $c['plage_horaire_id'],
                    'jour' => $c['jour'],
                    'heure_debut' => $c['heure_debut'],
                    'heure_fin' => $c['heure_fin'],
                    'generation_id' => $generation->id,
                    'verrouille' => $c['verrouille'] ?? false,
                ], $lot));
            }
        });
    }

    private function controleScenario(int $generationId): array
    {
        $creneaux = EmploiDuTemps::withoutGlobalScope('officiel')
            ->with(['classe.niveau', 'matiere', 'enseignant', 'salle'])
            ->where('generation_id', $generationId)->get();

        return $creneaux->isEmpty()
            ? ['nb_dures' => 0, 'nb_souples' => 0, 'violations' => []]
            : (new Validateur)->analyser($creneaux);
    }

    private function details(EdtGeneration $generation): array
    {
        $creneaux = EmploiDuTemps::withoutGlobalScope('officiel')
            ->with(['classe:id,nom_classe,niveau_id', 'matiere:id,libelle_matiere,abbr_matiere,couleur', 'enseignant:id,nom_enseignant,prenoms_enseignant', 'salle:id,nom'])
            ->where('generation_id', $generation->id)
            ->get();

        $rapport = $creneaux->isNotEmpty() ? (new Validateur)->analyser($creneaux) : ['score' => 0, 'nb_dures' => 0, 'nb_souples' => 0, 'violations' => []];

        return [
            'generation' => $generation,
            'controle' => $rapport,
            'par_classe' => $creneaux->groupBy(fn ($c) => $c->classe?->nom_classe ?? '?')
                ->map(fn ($g) => $g->sortBy(['jour', 'heure_debut'])->values())
                ->sortKeys(),
        ];
    }

    /**
     * Grille horaire de référence (pour l'affichage côté front).
     * GET /edt/grille-reference
     */
    public function grilleReference()
    {
        return response()->json(
            PlageHoraire::actives()->cours()->orderBy('heure_debut')->get(['id', 'libelle', 'jour', 'heure_debut', 'heure_fin'])
        );
    }
}
