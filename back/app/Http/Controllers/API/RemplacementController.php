<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Remplacement;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class RemplacementController extends Controller
{
    private function avec()
    {
        return ['creneau.classe', 'creneau.matiere', 'creneau.salle', 'enseignantAbsent', 'remplacant'];
    }

    public function index(Request $request)
    {
        $query = Remplacement::with($this->avec());

        if ($request->filled('date')) {
            $query->whereDate('date_remplacement', $request->date);
        }
        if ($request->filled('semaine')) {
            // semaine = date ISO du lundi
            $debut = \Carbon\Carbon::parse($request->semaine)->startOfWeek();
            $fin   = $debut->copy()->endOfWeek();
            $query->whereBetween('date_remplacement', [$debut, $fin]);
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('niveau_id')) {
            $query->whereHas('creneau.classe', fn ($q) => $q->where('niveau_id', $request->niveau_id));
        }
        if ($request->filled('matiere_id')) {
            $query->whereHas('creneau', fn ($q) => $q->where('matiere_id', $request->matiere_id));
        }

        return response()->json(
            $query->orderBy('date_remplacement', 'desc')->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'creneau_id'           => 'required|exists:emploi_du_temps,id',
            'date_remplacement'    => 'required|date',
            'enseignant_absent_id' => 'required|exists:enseignants,id',
            'remplacant_id'        => 'nullable|exists:enseignants,id|different:enseignant_absent_id',
            'statut'               => 'in:a_couvrir,couvert,non_couvert',
            'motif_absence'        => 'nullable|string|max:200',
            'note'                 => 'nullable|string',
        ]);

        $remplacement = Remplacement::create($request->only([
            'creneau_id', 'date_remplacement', 'enseignant_absent_id',
            'remplacant_id', 'statut', 'motif_absence', 'note',
        ]));

        // Notifier le remplaçant
        if ($remplacement->remplacant_id) {
            $this->notifierRemplacant($remplacement);
        }

        return response()->json($remplacement->load($this->avec()), 201);
    }

    public function show(int $id)
    {
        return response()->json(Remplacement::with($this->avec())->findOrFail($id));
    }

    public function update(Request $request, int $id)
    {
        $remplacement = Remplacement::findOrFail($id);
        $ancienRemplacant = $remplacement->remplacant_id;

        $request->validate([
            'remplacant_id'  => 'nullable|exists:enseignants,id|different:enseignant_absent_id',
            'statut'         => 'in:a_couvrir,couvert,non_couvert',
            'motif_absence'  => 'nullable|string|max:200',
            'note'           => 'nullable|string',
        ]);

        $remplacement->update($request->only([
            'remplacant_id', 'statut', 'motif_absence', 'note',
        ]));

        // Notifier le nouveau remplaçant si changé
        if ($remplacement->remplacant_id && $remplacement->remplacant_id !== $ancienRemplacant) {
            $this->notifierRemplacant($remplacement);
        }

        // Mettre statut à 'couvert' automatiquement si remplaçant affecté
        if ($remplacement->remplacant_id && $remplacement->statut === 'a_couvrir') {
            $remplacement->update(['statut' => 'couvert']);
        }

        return response()->json($remplacement->load($this->avec()));
    }

    public function destroy(int $id)
    {
        Remplacement::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    /**
     * Dashboard du jour courant + semaine courante.
     */
    public function dashboard()
    {
        $aujourd_hui = now()->toDateString();
        $debutSemaine = now()->startOfWeek()->toDateString();
        $finSemaine   = now()->endOfWeek()->toDateString();

        $aujourd = Remplacement::with($this->avec())
            ->whereDate('date_remplacement', $aujourd_hui)
            ->orderBy('date_remplacement')
            ->get();

        $semaine = Remplacement::with($this->avec())
            ->whereBetween('date_remplacement', [$debutSemaine, $finSemaine])
            ->orderBy('date_remplacement')
            ->get();

        return response()->json([
            'aujourd_hui' => $aujourd,
            'semaine'     => $semaine,
            'stats' => [
                'a_couvrir'   => $semaine->where('statut', 'a_couvrir')->count(),
                'couverts'    => $semaine->where('statut', 'couvert')->count(),
                'non_couverts'=> $semaine->where('statut', 'non_couvert')->count(),
            ],
        ]);
    }

    /**
     * Remplacements à assurer pour l'enseignant connecté (portail mobile).
     */
    public function mesRemplacements(Request $request)
    {
        $enseignant = $request->user();

        $query = Remplacement::with($this->avec())
            ->where('remplacant_id', $enseignant->id)
            ->where('date_remplacement', '>=', now()->toDateString())
            ->orderBy('date_remplacement');

        return response()->json($query->get());
    }

    private function notifierRemplacant(Remplacement $r): void
    {
        if (!$r->remplacant_id) return;
        try {
            $creneau = $r->creneau;
            $message = sprintf(
                'Remplacement le %s : %s de %s à %s (%s)',
                $r->date_remplacement->format('d/m/Y'),
                $creneau->matiere?->libelle_matiere ?? 'cours',
                substr($creneau->heure_debut, 0, 5),
                substr($creneau->heure_fin, 0, 5),
                $creneau->classe?->nom_classe ?? ''
            );
            app(NotificationService::class)->notifierEnseignant(
                $r->remplacant_id,
                'remplacement',
                'Remplacement à assurer',
                $message,
                ['remplacement_id' => $r->id]
            );
            $r->update(['notifie_enseignant' => true]);
        } catch (\Throwable) {}
    }
}
