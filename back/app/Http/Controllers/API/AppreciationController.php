<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AppreciationMatiere;
use App\Models\DecisionConseil;
use App\Models\Eleve;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppreciationController extends Controller
{
    // ── Appréciations par matière ────────────────────────────────────────────

    /**
     * GET /appreciations-matiere/{classeId}/{periodeId}
     * Retourne { eleve_id: { matiere_id: appreciation } } pour toute la classe.
     */
    public function parClasse(int $classeId, int $periodeId)
    {
        $rows = AppreciationMatiere::whereIn(
            'eleve_id',
            Eleve::where('classe_id', $classeId)->pluck('id')
        )
            ->where('periode_id', $periodeId)
            ->get(['eleve_id', 'matiere_id', 'appreciation']);

        $result = [];
        foreach ($rows as $r) {
            $result[$r->eleve_id][$r->matiere_id] = $r->appreciation;
        }

        return response()->json($result);
    }

    /**
     * POST /appreciations-matiere/batch
     * Body: { classe_id, matiere_id, periode_id, appreciations: [{eleve_id, appreciation}] }
     * Permet à un enseignant de sauvegarder ses appréciations pour une matière/classe/période.
     */
    public function sauvegarderBatch(Request $request)
    {
        $request->validate([
            'matiere_id'         => 'required|integer',
            'periode_id'         => 'required|integer',
            'appreciations'      => 'required|array',
            'appreciations.*.eleve_id'    => 'required|integer',
            'appreciations.*.appreciation' => 'nullable|string|max:300',
        ]);

        $matiereId = $request->integer('matiere_id');
        $periodeId = $request->integer('periode_id');
        $enseignantId = $request->user()?->id;

        DB::transaction(function () use ($request, $matiereId, $periodeId, $enseignantId) {
            foreach ($request->input('appreciations') as $item) {
                AppreciationMatiere::updateOrCreate(
                    [
                        'eleve_id'   => $item['eleve_id'],
                        'matiere_id' => $matiereId,
                        'periode_id' => $periodeId,
                    ],
                    [
                        'appreciation'  => $item['appreciation'] ?? null,
                        'enseignant_id' => $enseignantId,
                    ]
                );
            }
        });

        return response()->json(['message' => 'Appréciations enregistrées.']);
    }

    // ── Décisions du conseil de classe ───────────────────────────────────────

    /**
     * GET /decisions-conseil/{classeId}/{periodeId}
     * Retourne { eleve_id: { decision, appreciation_generale, label } } pour toute la classe.
     */
    public function decisionsClasse(int $classeId, int $periodeId)
    {
        $rows = DecisionConseil::whereIn(
            'eleve_id',
            Eleve::where('classe_id', $classeId)->pluck('id')
        )
            ->where('periode_id', $periodeId)
            ->get(['eleve_id', 'decision', 'appreciation_generale']);

        $result = [];
        foreach ($rows as $r) {
            $result[$r->eleve_id] = [
                'decision'              => $r->decision,
                'appreciation_generale' => $r->appreciation_generale,
                'label'                 => DecisionConseil::$LABELS[$r->decision] ?? null,
            ];
        }

        return response()->json($result);
    }

    /**
     * POST /decisions-conseil/batch
     * Body: { classe_id, periode_id, decisions: [{eleve_id, decision, appreciation_generale}] }
     */
    public function sauvegarderDecisions(Request $request)
    {
        $request->validate([
            'classe_id'  => 'required|integer',
            'periode_id' => 'required|integer',
            'decisions'  => 'required|array',
            'decisions.*.eleve_id'              => 'required|integer',
            'decisions.*.decision'              => 'nullable|string',
            'decisions.*.appreciation_generale' => 'nullable|string',
        ]);

        $classeId  = $request->integer('classe_id');
        $periodeId = $request->integer('periode_id');

        DB::transaction(function () use ($request, $classeId, $periodeId) {
            foreach ($request->input('decisions') as $item) {
                DecisionConseil::updateOrCreate(
                    [
                        'eleve_id'  => $item['eleve_id'],
                        'periode_id' => $periodeId,
                    ],
                    [
                        'classe_id'             => $classeId,
                        'decision'              => $item['decision'] ?? null,
                        'appreciation_generale' => $item['appreciation_generale'] ?? null,
                    ]
                );
            }
        });

        return response()->json(['message' => 'Décisions enregistrées.']);
    }
}
