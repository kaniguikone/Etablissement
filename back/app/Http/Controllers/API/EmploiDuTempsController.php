<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EmploiDuTemps;
use Illuminate\Http\Request;

class EmploiDuTempsController extends Controller
{
    private const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    public function index()
    {
        $creneaux = EmploiDuTemps::with(['classe', 'matiere', 'enseignant', 'salle'])->get();
        return response()->json($creneaux);
    }

    public function parClasse(int $classeId)
    {
        $creneaux = EmploiDuTemps::with(['matiere', 'enseignant', 'salle'])
            ->where('classe_id', $classeId)
            ->get()
            ->groupBy('jour')
            ->sortKeysUsing(fn ($a, $b) =>
                array_search($a, self::JOURS) <=> array_search($b, self::JOURS)
            );

        return response()->json($creneaux);
    }

    /**
     * Vérifie si un créneau chevauche un créneau existant pour la classe ou l'enseignant.
     * Retourne un tableau de messages d'erreur (vide si pas de conflit).
     */
    private function detecterChevauchements(
        string $jour,
        string $heureDebut,
        string $heureFin,
        int $classeId,
        int $enseignantId,
        ?int $salleId = null,
        ?int $exclureId = null
    ): array {
        $query = EmploiDuTemps::where('jour', $jour)
            ->where(function ($q) use ($heureDebut, $heureFin) {
                $q->where('heure_debut', '<', $heureFin)
                  ->where('heure_fin', '>', $heureDebut);
            });

        if ($exclureId) {
            $query->where('id', '!=', $exclureId);
        }

        $conflits = $query->with(['classe', 'enseignant', 'matiere', 'salle'])->get();

        $erreurs = [];

        foreach ($conflits as $c) {
            if ($c->classe_id === $classeId) {
                $erreurs[] = sprintf(
                    'Chevauchement classe : la classe a déjà %s de %s à %s le %s.',
                    $c->matiere?->abbr_matiere ?? '?',
                    substr($c->heure_debut, 0, 5),
                    substr($c->heure_fin, 0, 5),
                    $c->jour
                );
            }
            if ($c->enseignant_id === $enseignantId) {
                $erreurs[] = sprintf(
                    'Chevauchement enseignant : %s %s enseigne déjà de %s à %s le %s.',
                    $c->enseignant?->nom_enseignant ?? '?',
                    $c->enseignant?->prenoms_enseignant ?? '',
                    substr($c->heure_debut, 0, 5),
                    substr($c->heure_fin, 0, 5),
                    $c->jour
                );
            }
            if ($salleId && $c->salle_id === $salleId) {
                $erreurs[] = sprintf(
                    'Chevauchement salle : la salle "%s" est déjà occupée de %s à %s le %s.',
                    $c->salle?->nom ?? '?',
                    substr($c->heure_debut, 0, 5),
                    substr($c->heure_fin, 0, 5),
                    $c->jour
                );
            }
        }

        return array_values(array_unique($erreurs));
    }

    public function store(Request $request)
    {
        $request->validate([
            'classe_id'    => 'required|exists:classes,id',
            'matiere_id'   => 'required|exists:matieres,id',
            'enseignant_id'=> 'required|exists:enseignants,id',
            'salle_id'     => 'nullable|exists:salles,id',
            'jour'         => 'required|in:lundi,mardi,mercredi,jeudi,vendredi,samedi',
            'heure_debut'  => 'required|date_format:H:i',
            'heure_fin'    => ['required', 'date_format:H:i', function ($attr, $val, $fail) use ($request) {
                if ($val <= $request->heure_debut) {
                    $fail("L'heure de fin doit être après l'heure de début.");
                }
            }],
        ]);

        $erreurs = $this->detecterChevauchements(
            $request->jour,
            $request->heure_debut,
            $request->heure_fin,
            (int) $request->classe_id,
            (int) $request->enseignant_id,
            $request->salle_id ? (int) $request->salle_id : null
        );

        if (!empty($erreurs)) {
            return response()->json([
                'message' => 'Chevauchement horaire détecté.',
                'erreurs' => $erreurs,
            ], 422);
        }

        $creneau = EmploiDuTemps::create($request->only([
            'classe_id', 'matiere_id', 'enseignant_id', 'salle_id', 'jour', 'heure_debut', 'heure_fin',
        ]));

        return response()->json($creneau->load(['classe', 'matiere', 'enseignant', 'salle']), 201);
    }

    public function show(int $id)
    {
        $creneau = EmploiDuTemps::with(['classe', 'matiere', 'enseignant', 'salle'])->findOrFail($id);
        return response()->json($creneau);
    }

    public function update(Request $request, int $id)
    {
        $creneau = EmploiDuTemps::findOrFail($id);

        $request->validate([
            'classe_id'    => 'required|exists:classes,id',
            'matiere_id'   => 'required|exists:matieres,id',
            'enseignant_id'=> 'required|exists:enseignants,id',
            'salle_id'     => 'nullable|exists:salles,id',
            'jour'         => 'required|in:lundi,mardi,mercredi,jeudi,vendredi,samedi',
            'heure_debut'  => 'required|date_format:H:i',
            'heure_fin'    => ['required', 'date_format:H:i', function ($attr, $val, $fail) use ($request) {
                if ($val <= $request->heure_debut) {
                    $fail("L'heure de fin doit être après l'heure de début.");
                }
            }],
        ]);

        $erreurs = $this->detecterChevauchements(
            $request->jour,
            $request->heure_debut,
            $request->heure_fin,
            (int) $request->classe_id,
            (int) $request->enseignant_id,
            $request->salle_id ? (int) $request->salle_id : null,
            $id
        );

        if (!empty($erreurs)) {
            return response()->json([
                'message' => 'Chevauchement horaire détecté.',
                'erreurs' => $erreurs,
            ], 422);
        }

        $creneau->update($request->only([
            'classe_id', 'matiere_id', 'enseignant_id', 'salle_id', 'jour', 'heure_debut', 'heure_fin',
        ]));

        return response()->json($creneau->load(['classe', 'matiere', 'enseignant', 'salle']));
    }

    public function destroy(int $id)
    {
        EmploiDuTemps::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
