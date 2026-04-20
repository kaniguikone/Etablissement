<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Devoir;
use App\Models\Eleve;
use App\Models\Parents;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class DevoirController extends Controller
{
    public function index()
    {
        $devoirs = Devoir::with(['typeDevoir', 'matiere', 'classe', 'niveau', 'periode'])
            ->orderBy('date_devoir', 'desc')
            ->paginate(15);

        return response()->json($devoirs);
    }

    public function devoirsClasse(string $classeId)
    {
        $devoirs = Devoir::with(['typeDevoir', 'matiere', 'periode'])
            ->where('classe_id', $classeId)
            ->orderBy('date_devoir', 'desc')
            ->get();

        return response()->json($devoirs);
    }

    public function devoirsPeriode(string $periodeId)
    {
        $devoirs = Devoir::with(['typeDevoir', 'matiere', 'classe', 'niveau'])
            ->where('periode_id', $periodeId)
            ->orderBy('date_devoir', 'desc')
            ->paginate(15);

        return response()->json($devoirs);
    }

    /**
     * Suggère le prochain code disponible pour un pattern donné.
     * GET /devoirs/prochainCode?base=DS-MATH-6A-T1
     */
    public function prochainCode(Request $request)
    {
        $base = trim($request->query('base', ''));
        if (!$base) {
            return response()->json(['code' => '']);
        }

        $count = Devoir::where('code_devoir', 'like', $base . '-%')->count();
        $numero = str_pad($count + 1, 2, '0', STR_PAD_LEFT);

        return response()->json(['code' => $base . '-' . $numero]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'code_devoir'    => 'required|string|max:100',
            'date_devoir'    => 'required|date',
            'coeff_devoir'   => 'required|numeric|min:0',
            'type_devoir_id' => 'required|exists:type_devoirs,id',
            'matiere_id'     => 'required|exists:matieres,id',
            'classe_id'      => 'nullable|exists:classes,id',
            'niveau_id'      => 'nullable|exists:niveaux,id',
        ]);

        if (!$request->filled('classe_id') && !$request->filled('niveau_id')) {
            return response()->json([
                'errors' => ['cible' => ['Veuillez sélectionner une classe ou un niveau.']]
            ], 422);
        }

        $periode = \App\Models\Periodes::whereDate('date_debut', '<=', $request->date_devoir)
            ->whereDate('date_fin', '>=', $request->date_devoir)
            ->first();

        if (!$periode) {
            return response()->json([
                'errors' => ['date_devoir' => ['Cette date n\'appartient à aucune période scolaire.']]
            ], 422);
        }

        $devoir = Devoir::create([
            'code_devoir'    => $request->code_devoir,
            'date_devoir'    => $request->date_devoir,
            'coeff_devoir'   => $request->coeff_devoir,
            'type_devoir_id' => $request->type_devoir_id,
            'matiere_id'     => $request->matiere_id,
            'classe_id'      => $request->filled('classe_id') ? $request->classe_id : null,
            'niveau_id'      => $request->filled('niveau_id') ? $request->niveau_id : null,
            'periode_id'     => $periode->id,
        ]);

        $devoir->load(['typeDevoir', 'matiere', 'classe', 'niveau', 'periode']);

        // Notifier les parents des élèves concernés
        $this->notifierParentsDevoir($devoir, 'devoir', 'Nouveau devoir programmé', "Un nouveau devoir a été programmé : {$devoir->code_devoir} ({$devoir->matiere->libelle_matiere}) le {$devoir->date_devoir}.");

        return response()->json($devoir, 201);
    }

    public function show(string $id)
    {
        $devoir = Devoir::with(['typeDevoir', 'matiere', 'classe', 'niveau', 'periode'])->findOrFail($id);

        return response()->json($devoir);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'code_devoir'    => 'required|string|max:100',
            'date_devoir'    => 'required|date',
            'coeff_devoir'   => 'required|numeric|min:0',
            'type_devoir_id' => 'required|exists:type_devoirs,id',
            'matiere_id'     => 'required|exists:matieres,id',
            'classe_id'      => 'nullable|exists:classes,id',
            'niveau_id'      => 'nullable|exists:niveaux,id',
        ]);

        if (!$request->filled('classe_id') && !$request->filled('niveau_id')) {
            return response()->json([
                'errors' => ['cible' => ['Veuillez sélectionner une classe ou un niveau.']]
            ], 422);
        }

        $periode = \App\Models\Periodes::whereDate('date_debut', '<=', $request->date_devoir)
            ->whereDate('date_fin', '>=', $request->date_devoir)
            ->first();

        if (!$periode) {
            return response()->json([
                'errors' => ['date_devoir' => ['Cette date n\'appartient à aucune période scolaire.']]
            ], 422);
        }

        $devoir = Devoir::findOrFail($id);
        $devoir->update([
            'code_devoir'    => $request->code_devoir,
            'date_devoir'    => $request->date_devoir,
            'coeff_devoir'   => $request->coeff_devoir,
            'type_devoir_id' => $request->type_devoir_id,
            'matiere_id'     => $request->matiere_id,
            'classe_id'      => $request->filled('classe_id') ? $request->classe_id : null,
            'niveau_id'      => $request->filled('niveau_id') ? $request->niveau_id : null,
            'periode_id'     => $periode->id,
        ]);

        $devoir->load(['typeDevoir', 'matiere', 'classe', 'niveau', 'periode']);

        // Notifier les parents
        $this->notifierParentsDevoir($devoir, 'devoir', 'Devoir modifié', "Le devoir {$devoir->code_devoir} ({$devoir->matiere->libelle_matiere}) a été modifié. Nouvelle date : {$devoir->date_devoir}.");

        return response()->json($devoir);
    }

    public function destroy(string $id)
    {
        Devoir::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // ── Utilitaire ────────────────────────────────────────────────────────────

    private function notifierParentsDevoir(Devoir $devoir, string $type, string $titre, string $corps): void
    {
        $notifService = app(NotificationService::class);

        // Récupérer les IDs parents des élèves concernés (par classe ou par niveau)
        $query = Eleve::with('parents');
        if ($devoir->classe_id) {
            $query->where('classe_id', $devoir->classe_id);
        } elseif ($devoir->niveau_id) {
            $query->whereHas('classe', fn ($q) => $q->where('niveau_id', $devoir->niveau_id));
        } else {
            return;
        }

        $query->get()->each(function (Eleve $eleve) use ($notifService, $type, $titre, $corps, $devoir) {
            if ($eleve->parents) {
                $notifService->notifierParent(
                    $eleve->parents->id,
                    $type,
                    $titre,
                    $corps,
                    ['devoir_id' => $devoir->id, 'eleve_id' => $eleve->id]
                );
            }
        });
    }
}
