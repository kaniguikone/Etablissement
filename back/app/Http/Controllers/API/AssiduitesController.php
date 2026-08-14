<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Assiduites;
use App\Models\Eleve;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class AssiduitesController extends Controller
{
    public function index()
    {
        $assiduites = Assiduites::with(['eleve', 'matiere', 'periode'])
            ->orderBy('date_assiduite', 'desc')
            ->paginate(20);

        return response()->json($assiduites);
    }

    /**
     * Retourne les assiduités d'une classe pour une matière et une période données.
     * Utile pour la saisie en masse.
     */
    public function feuille(Request $request)
    {
        $request->validate([
            'classe_id'  => 'required|exists:classes,id',
            'matiere_id' => 'required|exists:matieres,id',
            'date'       => 'required|date',
        ]);

        $periode = \App\Models\Periodes::whereDate('date_debut', '<=', $request->date)
            ->whereDate('date_fin', '>=', $request->date)
            ->first();

        if (!$periode) {
            return response()->json([
                'errors' => ['date' => ['Cette date n\'appartient à aucune période scolaire.']]
            ], 422);
        }

        $eleves = Eleve::where('classe_id', $request->classe_id)
            ->orderBy('nom_eleve')
            ->get();

        $assiduites = Assiduites::where('matiere_id', $request->matiere_id)
            ->where('periode_id', $periode->id)
            ->where('date_assiduite', $request->date)
            ->whereIn('eleve_id', $eleves->pluck('id'))
            ->get()
            ->keyBy('eleve_id');

        // Récupérer heure_debut/heure_fin du premier enregistrement existant (même cours)
        $premierExistant = $assiduites->first();
        $heure_debut = $premierExistant?->heure_debut ?? null;
        $heure_fin   = $premierExistant?->heure_fin   ?? null;
        $duree       = $premierExistant?->duree        ?? null;

        $data = $eleves->map(function ($eleve) use ($assiduites) {
            $a = $assiduites->get($eleve->id);
            return [
                'eleve_id'        => $eleve->id,
                'matricule_eleve' => $eleve->matricule_eleve,
                'nom_eleve'       => $eleve->nom_eleve,
                'prenoms_eleve'   => $eleve->prenoms_eleve,
                'assiduite_id'    => $a?->id,
                'statut'          => $a?->statut ?? 'present',
                'remarque'        => $a?->remarque ?? '',
            ];
        });

        return response()->json([
            'heure_debut' => $heure_debut,
            'heure_fin'   => $heure_fin,
            'duree'       => $duree,
            'lignes'      => $data,
        ]);
    }

    /**
     * Sauvegarde en masse les assiduités d'une feuille de présence.
     */
    public function sauvegarder(Request $request)
    {
        $request->validate([
            'matiere_id'            => 'required|exists:matieres,id',
            'date_assiduite'        => 'required|date',
            'heure_debut'           => 'nullable|date_format:H:i',
            'heure_fin'             => 'nullable|date_format:H:i|after:heure_debut',
            'assiduites'            => 'required|array',
            'assiduites.*.eleve_id' => 'required|exists:eleves,id',
            'assiduites.*.statut'   => 'required|in:present,absent,retard',
            'assiduites.*.remarque' => 'nullable|string|max:255',
        ]);

        $periode = \App\Models\Periodes::whereDate('date_debut', '<=', $request->date_assiduite)
            ->whereDate('date_fin', '>=', $request->date_assiduite)
            ->first();

        if (!$periode) {
            return response()->json([
                'errors' => ['date_assiduite' => ['Cette date n\'appartient à aucune période scolaire.']]
            ], 422);
        }

        $duree = $this->calculerDuree($request->heure_debut, $request->heure_fin);

        $matiere      = \App\Models\Matiere::find($request->matiere_id);
        $notifService = app(NotificationService::class);

        foreach ($request->assiduites as $item) {
            $existing = Assiduites::where([
                'eleve_id'       => $item['eleve_id'],
                'matiere_id'     => $request->matiere_id,
                'periode_id'     => $periode->id,
                'date_assiduite' => $request->date_assiduite,
            ])->first();

            $statutPrecedent = $existing?->statut;

            Assiduites::updateOrCreate(
                [
                    'eleve_id'       => $item['eleve_id'],
                    'matiere_id'     => $request->matiere_id,
                    'periode_id'     => $periode->id,
                    'date_assiduite' => $request->date_assiduite,
                ],
                [
                    'statut'      => $item['statut'],
                    'remarque'    => $item['remarque'] ?? null,
                    'heure_debut' => $request->heure_debut,
                    'heure_fin'   => $request->heure_fin,
                    'duree'       => $duree,
                ]
            );

            // Notifier le parent uniquement si l'élève est absent ou en retard (et que ce n'était pas déjà le cas)
            if (in_array($item['statut'], ['absent', 'retard']) && $statutPrecedent !== $item['statut']) {
                $eleve = Eleve::with('parents')->find($item['eleve_id']);
                if ($eleve && $eleve->parents->isNotEmpty()) {
                    $label        = $item['statut'] === 'absent' ? 'absent(e)' : 'en retard';
                    $matiereNom   = $matiere?->libelle_matiere ?? 'un cours';
                    $heureInfo    = $request->heure_debut ? " ({$request->heure_debut}–{$request->heure_fin})" : '';
                    $dureeInfo    = $duree ? ", durée : {$duree}h" : '';
                    $titreAbsence = 'Absence signalée';
                    $corpsAbsence = "{$eleve->prenoms_eleve} {$eleve->nom_eleve} a été signalé(e) {$label} en {$matiereNom}{$heureInfo} le {$request->date_assiduite}{$dureeInfo}.";

                    foreach ($eleve->parents as $parent) {
                        $notifService->notifierParent(
                            $parent->id,
                            'absence',
                            $titreAbsence,
                            $corpsAbsence,
                            ['eleve_id' => $eleve->id, 'date' => $request->date_assiduite]
                        );

                        $notifService->envoyerEmailParent(
                            $parent->id,
                            $eleve->id,
                            "Absence signalée — {$eleve->prenoms_eleve} {$eleve->nom_eleve}",
                            $titreAbsence,
                            $corpsAbsence,
                            '#e67e22'
                        );
                    }
                }
            }
        }

        return response()->json(['message' => 'Assiduités enregistrées avec succès.']);
    }

    /**
     * Récapitulatif des absences d'un élève sur une période.
     */
    public function recapEleve(string $eleveId, string $periodeId)
    {
        $assiduites = Assiduites::with(['matiere', 'periode'])
            ->where('eleve_id', $eleveId)
            ->where('periode_id', $periodeId)
            ->orderBy('date_assiduite')
            ->get();

        $parMatiere = $assiduites->groupBy(fn($a) => $a->matiere->libelle_matiere)
            ->map(function ($items) {
                return [
                    'absences' => $items->where('statut', 'absent')->count(),
                    'retards'  => $items->where('statut', 'retard')->count(),
                    'presents' => $items->where('statut', 'present')->count(),
                    'total'    => $items->count(),
                    'detail'   => $items->map(fn($a) => [
                        'date'        => $a->date_assiduite,
                        'heure_debut' => $a->heure_debut,
                        'heure_fin'   => $a->heure_fin,
                        'duree'       => $a->duree,
                        'statut'      => $a->statut,
                        'remarque'    => $a->remarque,
                    ])->values(),
                ];
            });

        return response()->json([
            'eleve_id'   => $eleveId,
            'periode_id' => $periodeId,
            'parMatiere' => $parMatiere,
        ]);
    }

    public function show(string $id)
    {
        return response()->json(Assiduites::with(['eleve', 'matiere', 'periode'])->findOrFail($id));
    }

    public function store(Request $request)
    {
        $request->validate([
            'date_assiduite' => 'required|date',
            'heure_debut'    => 'nullable|date_format:H:i',
            'heure_fin'      => 'nullable|date_format:H:i|after:heure_debut',
            'statut'         => 'required|in:present,absent,retard',
            'remarque'       => 'nullable|string|max:255',
            'eleve_id'       => 'required|exists:eleves,id',
            'matiere_id'     => 'required|exists:matieres,id',
        ]);

        $periode = \App\Models\Periodes::whereDate('date_debut', '<=', $request->date_assiduite)
            ->whereDate('date_fin', '>=', $request->date_assiduite)
            ->first();

        if (!$periode) {
            return response()->json([
                'errors' => ['date_assiduite' => ['Cette date n\'appartient à aucune période scolaire.']]
            ], 422);
        }

        $assiduite = Assiduites::create(array_merge(
            $request->only(['date_assiduite', 'heure_debut', 'heure_fin', 'statut', 'remarque', 'eleve_id', 'matiere_id']),
            [
                'periode_id' => $periode->id,
                'duree'      => $this->calculerDuree($request->heure_debut, $request->heure_fin),
            ]
        ));

        return response()->json($assiduite->load(['eleve', 'matiere', 'periode']), 201);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'date_assiduite' => 'required|date',
            'heure_debut'    => 'nullable|date_format:H:i',
            'heure_fin'      => 'nullable|date_format:H:i|after:heure_debut',
            'statut'         => 'required|in:present,absent,retard',
            'remarque'       => 'nullable|string|max:255',
            'eleve_id'       => 'required|exists:eleves,id',
            'matiere_id'     => 'required|exists:matieres,id',
        ]);

        $periode = \App\Models\Periodes::whereDate('date_debut', '<=', $request->date_assiduite)
            ->whereDate('date_fin', '>=', $request->date_assiduite)
            ->first();

        if (!$periode) {
            return response()->json([
                'errors' => ['date_assiduite' => ['Cette date n\'appartient à aucune période scolaire.']]
            ], 422);
        }

        $assiduite = Assiduites::findOrFail($id);
        $assiduite->update(array_merge(
            $request->only(['date_assiduite', 'heure_debut', 'heure_fin', 'statut', 'remarque', 'eleve_id', 'matiere_id']),
            [
                'periode_id' => $periode->id,
                'duree'      => $this->calculerDuree($request->heure_debut, $request->heure_fin),
            ]
        ));

        return response()->json($assiduite->load(['eleve', 'matiere', 'periode']));
    }

    public function destroy(string $id)
    {
        Assiduites::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function calculerDuree(?string $heureDebut, ?string $heureFin): ?float
    {
        if (!$heureDebut || !$heureFin) {
            return null;
        }
        $debut = strtotime($heureDebut);
        $fin   = strtotime($heureFin);
        if ($fin <= $debut) {
            return null;
        }
        return round(($fin - $debut) / 3600, 2);
    }
}
