<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Sanction;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class SanctionController extends Controller
{
    private const TYPES_VALIDES = [
        'avertissement', 'blame', 'exclusion_temp',
        'exclusion_def', 'convocation', 'autre',
    ];

    /**
     * Liste des sanctions, filtrables par élève ou classe.
     */
    public function index(Request $request)
    {
        $query = Sanction::with(['eleve.classe'])
            ->orderBy('date_sanction', 'desc');

        if ($request->filled('eleve_id')) {
            $query->where('eleve_id', $request->eleve_id);
        }

        if ($request->filled('classe_id')) {
            $query->whereHas('eleve', fn($q) => $q->where('classe_id', $request->classe_id));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->whereHas('eleve', function ($q) use ($s) {
                $q->where('nom_eleve', 'like', $s)
                  ->orWhere('prenoms_eleve', 'like', $s)
                  ->orWhere('matricule_eleve', 'like', $s);
            });
        }

        return response()->json($query->paginate(25));
    }

    /**
     * Sanctions d'un élève spécifique.
     */
    public function parEleve(string $eleveId)
    {
        $eleve    = Eleve::with('classe.niveau')->findOrFail($eleveId);
        $sanctions = Sanction::where('eleve_id', $eleveId)
            ->orderBy('date_sanction', 'desc')
            ->get();

        // Statistiques rapides
        $stats = [
            'total'           => $sanctions->count(),
            'par_type'        => $sanctions->groupBy('type')->map->count(),
            'non_notifies'    => $sanctions->where('parent_notifie', false)->count(),
        ];

        return response()->json(compact('eleve', 'sanctions', 'stats'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'eleve_id'       => 'required|exists:eleves,id',
            'type'           => 'required|in:' . implode(',', self::TYPES_VALIDES),
            'motif'          => 'required|string|max:300',
            'description'    => 'nullable|string',
            'date_sanction'  => 'required|date',
            'date_fin'       => 'nullable|date|after_or_equal:date_sanction',
            'prononcee_par'  => 'nullable|string|max:150',
            'parent_notifie' => 'boolean',
        ]);

        $sanction = Sanction::create($request->only([
            'eleve_id', 'type', 'motif', 'description',
            'date_sanction', 'date_fin', 'prononcee_par', 'parent_notifie',
        ]));

        $sanction->load('eleve.classe');

        // Notifier le parent si demandé
        if ($request->boolean('parent_notifie')) {
            $this->notifierParent($sanction);
        }

        return response()->json($sanction, 201);
    }

    public function show(string $id)
    {
        return response()->json(
            Sanction::with('eleve.classe.niveau')->findOrFail($id)
        );
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'type'           => 'required|in:' . implode(',', self::TYPES_VALIDES),
            'motif'          => 'required|string|max:300',
            'description'    => 'nullable|string',
            'date_sanction'  => 'required|date',
            'date_fin'       => 'nullable|date|after_or_equal:date_sanction',
            'prononcee_par'  => 'nullable|string|max:150',
            'parent_notifie' => 'boolean',
        ]);

        $sanction = Sanction::findOrFail($id);
        $etaitNotifie = $sanction->parent_notifie;

        $sanction->update($request->only([
            'type', 'motif', 'description',
            'date_sanction', 'date_fin', 'prononcee_par', 'parent_notifie',
        ]));

        // Envoyer la notif si elle vient d'être cochée
        if (!$etaitNotifie && $request->boolean('parent_notifie')) {
            $sanction->load('eleve.classe');
            $this->notifierParent($sanction);
        }

        return response()->json($sanction->load('eleve.classe'));
    }

    public function destroy(string $id)
    {
        Sanction::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    /**
     * Marque manuellement la notification du parent et envoie la notif.
     */
    public function notifier(string $id)
    {
        $sanction = Sanction::with('eleve.classe')->findOrFail($id);
        $sanction->update(['parent_notifie' => true]);
        $this->notifierParent($sanction);
        return response()->json(['message' => 'Notification envoyée au parent.']);
    }

    private function notifierParent(Sanction $sanction): void
    {
        $eleve = $sanction->eleve;
        if (!$eleve || $eleve->parents->isEmpty()) return;

        $labels = [
            'avertissement' => 'Avertissement',
            'blame'         => 'Blâme',
            'exclusion_temp'=> 'Exclusion temporaire',
            'exclusion_def' => 'Exclusion définitive',
            'convocation'   => 'Convocation',
            'autre'         => 'Sanction',
        ];

        $label = $labels[$sanction->type] ?? 'Sanction';
        $corps = "{$label} prononcé(e) pour {$eleve->prenoms_eleve} {$eleve->nom_eleve} "
               . "le {$sanction->date_sanction->format('d/m/Y')} : {$sanction->motif}";

        if ($sanction->date_fin) {
            $corps .= " (jusqu'au {$sanction->date_fin->format('d/m/Y')})";
        }

        $service = app(NotificationService::class);
        $titre   = $label . ' — ' . $eleve->prenoms_eleve . ' ' . $eleve->nom_eleve;

        foreach ($eleve->parents as $parent) {
            $service->notifierParent(
                $parent->id,
                'sanction',
                $titre,
                $corps,
                ['eleve_id' => $eleve->id, 'sanction_id' => $sanction->id]
            );

            $service->envoyerEmailParent(
                $parent->id,
                $eleve->id,
                "Sanction scolaire — {$eleve->prenoms_eleve} {$eleve->nom_eleve}",
                $titre,
                $corps,
                '#c0392b'
            );
        }
    }
}
