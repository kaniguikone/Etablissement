<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ChapitreMatiere;
use App\Models\Matiere;
use App\Models\Progression;
use Illuminate\Http\Request;

class ChapitreMatiereController extends Controller
{
    /**
     * Chapitres d'une matière avec, pour chaque chapitre,
     * les progressions agrégées par classe (pour la vue direction).
     * GET /chapitresMatiere/{matiere_id}
     */
    public function parMatiere(Request $request, int $matiereId)
    {
        $matiere  = Matiere::findOrFail($matiereId);
        $niveauId = $request->query('niveau_id');

        $serieId = $request->query('serie_id');

        $query = ChapitreMatiere::where('matiere_id', $matiereId)->orderBy('ordre');

        if ($niveauId) {
            $query->where('niveau_id', $niveauId);
        }

        if ($serieId) {
            // Retourner les chapitres spécifiques à la série OU les chapitres communs (serie_id null)
            $query->where(fn($q) => $q->where('serie_id', $serieId)->orWhereNull('serie_id'));
        }

        return response()->json([
            'matiere'   => $matiere,
            'chapitres' => $query->get(),
        ]);
    }

    /**
     * Créer un chapitre.
     * POST /chapitresMatiere
     */
    public function store(Request $request)
    {
        $request->validate([
            'matiere_id'     => 'required|exists:matieres,id',
            'niveau_id'      => 'required|exists:niveaux,id',
            'serie_id'       => 'nullable|exists:series,id',
            'titre'          => 'required|string|max:255',
            'ordre'          => 'required|integer|min:1',
            'note_direction' => 'nullable|string|max:1000',
        ]);

        $chapitre = ChapitreMatiere::create($request->only(
            'matiere_id', 'niveau_id', 'serie_id', 'titre', 'ordre', 'note_direction'
        ));

        return response()->json($chapitre, 201);
    }

    /**
     * Modifier un chapitre.
     * PUT /chapitresMatiere/{id}
     */
    public function update(Request $request, int $id)
    {
        $chapitre = ChapitreMatiere::findOrFail($id);

        $request->validate([
            'titre'          => 'required|string|max:255',
            'ordre'          => 'required|integer|min:1',
            'note_direction' => 'nullable|string|max:1000',
        ]);

        $chapitre->update($request->only('titre', 'ordre', 'note_direction'));

        return response()->json($chapitre);
    }

    /**
     * Supprimer un chapitre.
     * DELETE /chapitresMatiere/{id}
     */
    public function destroy(int $id)
    {
        ChapitreMatiere::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    /**
     * Vue direction : progression par classe pour une matière donnée.
     * Retourne pour chaque classe les chapitres avec le statut de chaque prof.
     * GET /progressionMatiere/{matiere_id}?periode_id=
     */
    public function progressionParMatiere(Request $request, int $matiereId)
    {
        $periodeId = $request->query('periode_id');

        $chapitres = ChapitreMatiere::where('matiere_id', $matiereId)
            ->orderBy('ordre')
            ->get();

        $query = Progression::with(['classe', 'enseignant'])
            ->whereHas('chapitre', fn ($q) => $q->where('matiere_id', $matiereId));

        if ($periodeId) {
            $query->where('periode_id', $periodeId);
        }

        $progressions = $query->get()->groupBy('classe_id');

        // Construire le résumé par classe
        $parClasse = $progressions->map(function ($items, $classeId) use ($chapitres) {
            $classe      = $items->first()->classe;
            $enseignant  = $items->first()->enseignant;
            $total       = $chapitres->count();
            $faits       = $items->where('statut', 'fait')->count();
            $enCours     = $items->where('statut', 'en_cours')->count();
            $reportes    = $items->where('statut', 'reporte')->count();

            return [
                'classe_id'         => $classeId,
                'nom_classe'        => $classe?->nom_classe,
                'enseignant'        => $enseignant
                    ? $enseignant->nom_enseignant . ' ' . $enseignant->prenoms_enseignant
                    : null,
                'total_chapitres'   => $total,
                'faits'             => $faits,
                'en_cours'          => $enCours,
                'reportes'          => $reportes,
                'non_abordes'       => $total - $faits - $enCours - $reportes,
                'taux'              => $total > 0 ? round(($faits / $total) * 100) : 0,
                'details'           => $items->keyBy('chapitre_id')->map(fn ($p) => [
                    'statut'       => $p->statut,
                    'date_seance'  => $p->date_seance,
                    'observations' => $p->observations,
                ]),
            ];
        })->values();

        return response()->json([
            'chapitres'  => $chapitres,
            'par_classe' => $parClasse,
        ]);
    }
}
