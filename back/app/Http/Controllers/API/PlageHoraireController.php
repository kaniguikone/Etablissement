<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EmploiDuTemps;
use App\Models\PlageHoraire;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Grille horaire de l'établissement — chantier EDT, Lot 0.2.
 */
class PlageHoraireController extends Controller
{
    public function index()
    {
        $plages = PlageHoraire::orderBy('ordre')->orderBy('heure_debut')->get();

        return response()->json($plages);
    }

    public function store(Request $request)
    {
        $data = $this->valider($request);
        $this->verifierChevauchement($data);

        $plage = PlageHoraire::create($data);

        return response()->json($plage, 201);
    }

    public function update(Request $request, int $id)
    {
        $plage = PlageHoraire::findOrFail($id);
        $data = $this->valider($request);
        $this->verifierChevauchement($data, $id);

        $plage->update($data);

        return response()->json($plage);
    }

    public function destroy(int $id)
    {
        $plage = PlageHoraire::findOrFail($id);

        if (EmploiDuTemps::where('plage_horaire_id', $id)->exists()) {
            return response()->json([
                'message' => 'Cette plage est utilisée par des créneaux d\'emploi du temps. Retirez-les d\'abord.',
            ], 422);
        }

        $plage->delete();

        return response()->json(null, 204);
    }

    /**
     * Recopie les plages d'un jour vers un ou plusieurs autres jours.
     * Body : { source: 'lundi', cibles: ['mardi','jeudi'], remplacer: true }
     */
    public function dupliquerJour(Request $request)
    {
        $data = $request->validate([
            'source' => ['required', Rule::in(PlageHoraire::JOURS)],
            'cibles' => 'required|array|min:1',
            'cibles.*' => [Rule::in(PlageHoraire::JOURS)],
            'remplacer' => 'nullable|boolean',
        ]);

        $sources = PlageHoraire::where('jour', $data['source'])->orderBy('ordre')->get();
        if ($sources->isEmpty()) {
            return response()->json(['message' => "Aucune plage définie pour {$data['source']}."], 422);
        }

        $creees = 0;
        foreach (array_unique($data['cibles']) as $cible) {
            if ($cible === $data['source']) {
                continue;
            }
            if ($request->boolean('remplacer')) {
                PlageHoraire::where('jour', $cible)->delete();
            }
            foreach ($sources as $s) {
                PlageHoraire::create([
                    'annee_scolaire_id' => $s->annee_scolaire_id,
                    'libelle' => $s->libelle,
                    'jour' => $cible,
                    'ordre' => $s->ordre,
                    'heure_debut' => $s->heure_debut,
                    'heure_fin' => $s->heure_fin,
                    'type' => $s->type,
                    'actif' => $s->actif,
                ]);
                $creees++;
            }
        }

        return response()->json(['message' => "{$creees} plage(s) recopiée(s).", 'creees' => $creees]);
    }

    private function valider(Request $request): array
    {
        return $request->validate([
            'annee_scolaire_id' => 'nullable|exists:annees_scolaires,id',
            'libelle' => 'required|string|max:50',
            'jour' => ['nullable', Rule::in(PlageHoraire::JOURS)],
            'ordre' => 'nullable|integer|min:0|max:50',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => ['required', 'date_format:H:i', function ($attr, $val, $fail) use ($request) {
                if ($val <= $request->heure_debut) {
                    $fail("L'heure de fin doit être après l'heure de début.");
                }
            }],
            'type' => ['nullable', Rule::in(PlageHoraire::TYPES)],
            'actif' => 'nullable|boolean',
        ]);
    }

    /**
     * Deux plages du même jour ne peuvent pas se chevaucher (en tenant compte
     * des plages « tous les jours » — jour = null).
     */
    private function verifierChevauchement(array $data, ?int $exclureId = null): void
    {
        $jour = $data['jour'] ?? null;

        $query = PlageHoraire::where('heure_debut', '<', $data['heure_fin'])
            ->where('heure_fin', '>', $data['heure_debut']);

        if ($jour === null) {
            // une plage « tous les jours » entre en conflit avec n'importe quelle plage
        } else {
            $query->where(fn ($q) => $q->where('jour', $jour)->orWhereNull('jour'));
        }

        if ($exclureId) {
            $query->where('id', '!=', $exclureId);
        }

        if ($query->exists()) {
            throw new HttpResponseException(response()->json([
                'message' => 'Cette plage en chevauche une autre sur le même créneau.',
            ], 422));
        }
    }
}
