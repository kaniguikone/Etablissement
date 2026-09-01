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

            DB::transaction(function () use ($resultat, $generation) {
                foreach (array_chunk($resultat['creneaux'], 200) as $lot) {
                    EmploiDuTemps::insert(array_map(
                        fn ($c) => $c + ['generation_id' => $generation->id, 'verrouille' => false],
                        $lot,
                    ));
                }
            });

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
    public function publier(int $id)
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

        return response()->json(['message' => 'Emploi du temps publié.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

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
