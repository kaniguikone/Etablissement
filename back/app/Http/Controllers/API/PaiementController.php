<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\Paiement;
use App\Models\Scolarites;
use App\Services\NotificationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class PaiementController extends Controller
{
    public function index(Request $request)
    {
        $query = Paiement::with(['eleve', 'scolarite.niveau'])
            ->orderBy('date_paiement', 'desc');

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->whereHas('eleve', function ($q) use ($s) {
                $q->where('nom_eleve', 'like', $s)
                  ->orWhere('prenoms_eleve', 'like', $s)
                  ->orWhere('matricule_eleve', 'like', $s);
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Retourne tous les paiements d'un élève, avec le récapitulatif
     * des échéances dues vs payées.
     */
    public function parEleve(string $eleveId)
    {
        $eleve = Eleve::with('classe.niveau')->findOrFail($eleveId);

        // Échéances dues pour le niveau de l'élève
        $echeances = Scolarites::where('niveau_id', $eleve->classe?->niveau_id)
            ->orderBy('date_echeance')
            ->get();

        // Paiements effectués par cet élève (tentatives CinetPay non abouties exclues)
        $paiements = Paiement::with('scolarite')
            ->where('eleve_id', $eleveId)
            ->confirmes()
            ->orderBy('date_paiement', 'desc')
            ->get();

        // Calcul du total dû et du total payé par échéance
        $recapEcheances = $echeances->map(function ($echeance) use ($paiements) {
            $payesPourEcheance = $paiements
                ->where('scolarite_id', $echeance->id)
                ->sum('montant_paye');
            return [
                'scolarite_id'     => $echeance->id,
                'libelle'          => $echeance->libelle_echeance,
                'date_echeance'    => $echeance->date_echeance,
                'montant_du'       => (float) $echeance->montant_echeance,
                'montant_paye'     => (float) $payesPourEcheance,
                'solde'            => (float) $echeance->montant_echeance - (float) $payesPourEcheance,
                'statut'           => $payesPourEcheance >= $echeance->montant_echeance ? 'soldé' : ($payesPourEcheance > 0 ? 'partiel' : 'impayé'),
            ];
        });

        $totalDu    = $echeances->sum('montant_echeance');
        $totalPaye  = $paiements->sum('montant_paye');

        return response()->json([
            'eleve'            => $eleve,
            'recap_echeances'  => $recapEcheances,
            'paiements'        => $paiements,
            'total_du'         => (float) $totalDu,
            'total_paye'       => (float) $totalPaye,
            'solde_restant'    => (float) $totalDu - (float) $totalPaye,
        ]);
    }

    /**
     * Retourne un récapitulatif des paiements pour un niveau (vue admin).
     */
    public function recapNiveau(string $niveauId)
    {
        $echeances = Scolarites::where('niveau_id', $niveauId)->get();
        $eleveIds = Eleve::whereHas('classe', fn($q) => $q->where('niveau_id', $niveauId))->pluck('id');

        $paiementsParEleve = Paiement::whereIn('eleve_id', $eleveIds)
            ->confirmes()
            ->select('eleve_id', \Illuminate\Support\Facades\DB::raw('sum(montant_paye) as total_paye'))
            ->groupBy('eleve_id')
            ->pluck('total_paye', 'eleve_id');

        $eleves = Eleve::whereIn('id', $eleveIds)->with('classe:id,abbr_classe')->orderBy('nom_eleve')->get();
        $totalDu = (float) $echeances->sum('montant_echeance');

        $data = $eleves->map(function ($eleve) use ($totalDu, $paiementsParEleve) {
            $totalPaye  = (float) ($paiementsParEleve[$eleve->id] ?? 0);
            return [
                'eleve_id'     => $eleve->id,
                'nom'          => $eleve->nom_eleve . ' ' . $eleve->prenoms_eleve,
                'matricule'    => $eleve->matricule_eleve,
                'classe'       => $eleve->classe?->abbr_classe,
                'total_du'     => (float) $totalDu,
                'total_paye'   => (float) $totalPaye,
                'solde'        => (float) $totalDu - (float) $totalPaye,
                'statut'       => $totalPaye >= $totalDu ? 'soldé' : ($totalPaye > 0 ? 'partiel' : 'impayé'),
            ];
        });

        return response()->json($data);
    }

    public function store(Request $request)
    {
        $request->validate([
            'eleve_id'           => 'required|exists:eleves,id',
            'scolarite_id'       => 'required|exists:scolarites,id',
            'montant_paye'       => 'required|numeric|min:1',
            'date_paiement'      => 'required|date',
            'mode_paiement'      => 'required|in:especes,cheque,virement,autre',
            'reference_paiement' => 'nullable|string|max:100',
            'remarque'           => 'nullable|string|max:255',
        ]);

        $paiement = Paiement::create($request->only([
            'eleve_id', 'scolarite_id', 'montant_paye', 'date_paiement',
            'mode_paiement', 'reference_paiement', 'remarque',
        ]));

        return response()->json($paiement->load(['eleve', 'scolarite']), 201);
    }

    public function show(string $id)
    {
        return response()->json(
            Paiement::with(['eleve', 'scolarite.niveau'])->findOrFail($id)
        );
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'eleve_id'           => 'required|exists:eleves,id',
            'scolarite_id'       => 'required|exists:scolarites,id',
            'montant_paye'       => 'required|numeric|min:1',
            'date_paiement'      => 'required|date',
            'mode_paiement'      => 'required|in:especes,cheque,virement,autre',
            'reference_paiement' => 'nullable|string|max:100',
            'remarque'           => 'nullable|string|max:255',
        ]);

        $paiement = Paiement::findOrFail($id);
        $paiement->update($request->only([
            'eleve_id', 'scolarite_id', 'montant_paye', 'date_paiement',
            'mode_paiement', 'reference_paiement', 'remarque',
        ]));

        return response()->json($paiement->load(['eleve', 'scolarite']));
    }

    public function destroy(string $id)
    {
        Paiement::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    /**
     * Déclenche manuellement les relances email pour paiements en retard.
     * POST /api/relances-paiements
     */
    public function relancerImpayes(Request $request)
    {
        $result = app(NotificationService::class)->relancerPaiementsEnRetard();

        return response()->json([
            'message' => "Relances envoyées : {$result['envoyes']}. Sans email : {$result['ignores']}.",
            'envoyes' => $result['envoyes'],
            'ignores' => $result['ignores'],
        ]);
    }

    /**
     * Télécharge le reçu PDF d'un paiement.
     */
    public function recu(string $id)
    {
        $paiement      = Paiement::with(['eleve.classe.niveau', 'scolarite'])->findOrFail($id);
        $etablissement = Etablissement::first();

        $pdf = Pdf::loadView('paiements.recu', compact('paiement', 'etablissement'))
            ->setPaper('A5', 'portrait');

        $nomFichier = sprintf(
            'recu_%s_%s_%s.pdf',
            str_pad($paiement->id, 6, '0', STR_PAD_LEFT),
            strtolower($paiement->eleve->nom_eleve),
            $paiement->date_paiement
        );

        return $pdf->download($nomFichier);
    }

    /**
     * Échéancier : vue calendrier des paiements à venir / en retard.
     * Filtres: niveau_id, classe_id, horizon (nb jours, défaut 60)
     */
    public function echeancier(Request $request)
    {
        $niveauId  = $request->query('niveau_id');
        $classeId  = $request->query('classe_id');
        $horizon   = (int) ($request->query('horizon', 90));
        $today     = now()->toDateString();
        $dateLimite = now()->addDays($horizon)->toDateString();

        // Échéances à venir dans l'horizon
        $echeancesQuery = Scolarites::orderBy('date_echeance');
        if ($niveauId) {
            $echeancesQuery->where('niveau_id', $niveauId);
        }
        $echeances = $echeancesQuery->get();

        // Élèves concernés
        $eleveQuery = Eleve::with('classe.niveau');
        if ($classeId) {
            $eleveQuery->where('classe_id', $classeId);
        } elseif ($niveauId) {
            $eleveQuery->whereHas('classe', fn($q) => $q->where('niveau_id', $niveauId));
        }
        $eleves = $eleveQuery->orderBy('nom_eleve')->get();

        // Paiements existants (tentatives CinetPay non abouties exclues)
        $paiements = Paiement::whereIn('eleve_id', $eleves->pluck('id'))
            ->confirmes()
            ->get()->groupBy(fn($p) => $p->eleve_id . '_' . $p->scolarite_id);

        $lignes = [];

        foreach ($echeances as $ech) {
            foreach ($eleves as $eleve) {
                // Filtrer par niveau de l'élève
                if ($eleve->classe?->niveau_id !== $ech->niveau_id) continue;

                $key = $eleve->id . '_' . $ech->id;
                $payeTotal = ($paiements[$key] ?? collect())->sum('montant_paye');
                $solde = max(0, $ech->montant_echeance - $payeTotal);

                if ($solde <= 0) continue; // soldé → ne pas afficher

                $joursRestants = (int) now()->diffInDays($ech->date_echeance, false);
                $enRetard = $joursRestants < 0;

                // Hors horizon futur → toujours inclus si en retard
                if (!$enRetard && $ech->date_echeance > $dateLimite) continue;

                $lignes[] = [
                    'eleve_id'       => $eleve->id,
                    'nom'            => $eleve->nom_eleve . ' ' . $eleve->prenoms_eleve,
                    'matricule'      => $eleve->matricule_eleve,
                    'classe'         => $eleve->classe?->nom_classe,
                    'niveau'         => $eleve->classe?->niveau?->abbr_niveau,
                    'echeance_id'    => $ech->id,
                    'libelle'        => $ech->libelle_echeance,
                    'date_echeance'  => $ech->date_echeance,
                    'montant_du'     => (float) $ech->montant_echeance,
                    'montant_paye'   => (float) $payeTotal,
                    'solde'          => (float) $solde,
                    'jours_restants' => $joursRestants,
                    'en_retard'      => $enRetard,
                    'statut'         => $enRetard ? 'retard' : ($joursRestants <= 7 ? 'urgent' : 'a_venir'),
                ];
            }
        }

        // Trier : retards en premier, puis par date d'échéance
        usort($lignes, function ($a, $b) {
            if ($a['en_retard'] !== $b['en_retard']) return $b['en_retard'] - $a['en_retard'];
            return strcmp($a['date_echeance'], $b['date_echeance']);
        });

        return response()->json([
            'data'           => $lignes,
            'total_solde'    => array_sum(array_column($lignes, 'solde')),
            'nb_en_retard'   => count(array_filter($lignes, fn($l) => $l['en_retard'])),
            'nb_urgent'      => count(array_filter($lignes, fn($l) => $l['statut'] === 'urgent')),
            'nb_a_venir'     => count(array_filter($lignes, fn($l) => $l['statut'] === 'a_venir')),
        ]);
    }

    /**
     * Liste des élèves ayant un solde impayé.
     * Filtres: niveau_id, classe_id
     */
    public function impayes(Request $request)
    {
        $query = Eleve::with('classe.niveau');

        if ($request->filled('niveau_id')) {
            $query->whereHas('classe', fn($q) => $q->where('niveau_id', $request->niveau_id));
        }
        if ($request->filled('classe_id')) {
            $query->where('classe_id', $request->classe_id);
        }

        $eleves = $query->with('classe.niveau.scolarites')->orderBy('nom_eleve')->get();

        // Pré-charger les paiements de tous les élèves en une seule requête (tentatives CinetPay non abouties exclues)
        $eleveIds = $eleves->pluck('id');
        $paiementsParEleve = Paiement::whereIn('eleve_id', $eleveIds)
            ->confirmes()
            ->select('eleve_id', \Illuminate\Support\Facades\DB::raw('sum(montant_paye) as total_paye'))
            ->groupBy('eleve_id')
            ->pluck('total_paye', 'eleve_id');

        $impayes = $eleves->map(function ($eleve) use ($paiementsParEleve) {
            $totalDu   = (float) ($eleve->classe?->niveau?->scolarites?->sum('montant_echeance') ?? 0);
            $totalPaye = (float) ($paiementsParEleve[$eleve->id] ?? 0);
            $solde     = $totalDu - $totalPaye;

            if ($solde <= 0) return null;

            return [
                'eleve_id'   => $eleve->id,
                'nom'        => $eleve->nom_eleve . ' ' . $eleve->prenoms_eleve,
                'matricule'  => $eleve->matricule_eleve,
                'classe'     => $eleve->classe?->nom_classe,
                'niveau'     => $eleve->classe?->niveau?->libelle_niveau,
                'total_du'   => $totalDu,
                'total_paye' => $totalPaye,
                'solde'      => $solde,
                'statut'     => $totalPaye > 0 ? 'partiel' : 'impayé',
            ];
        })->filter()->values();

        return response()->json([
            'data'          => $impayes,
            'total_impayes' => $impayes->sum('solde'),
            'count'         => $impayes->count(),
        ]);
    }

    /**
     * Export CSV des paiements.
     * Filtres: niveau_id, mois (YYYY-MM), search
     */
    public function exportCsv(Request $request)
    {
        $query = Paiement::with(['eleve.classe.niveau', 'scolarite'])
            ->confirmes()
            ->orderBy('date_paiement', 'desc');

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->whereHas('eleve', function ($q) use ($s) {
                $q->where('nom_eleve', 'like', $s)
                  ->orWhere('prenoms_eleve', 'like', $s)
                  ->orWhere('matricule_eleve', 'like', $s);
            });
        }

        if ($request->filled('niveau_id')) {
            $query->whereHas('eleve.classe', fn($q) => $q->where('niveau_id', $request->niveau_id));
        }

        if ($request->filled('mois')) {
            $query->where('date_paiement', 'like', $request->mois . '%');
        }

        $paiements = $query->get();
        $modes = ['especes' => 'Espèces', 'cheque' => 'Chèque', 'virement' => 'Virement', 'autre' => 'Autre', 'cinetpay' => 'CinetPay'];

        $filename = 'paiements_' . date('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($paiements, $modes) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel
            fputcsv($handle, ['ID', 'Date', 'Matricule', 'Élève', 'Classe', 'Niveau', 'Échéance', 'Montant payé', 'Mode', 'Référence'], ';');
            foreach ($paiements as $p) {
                fputcsv($handle, [
                    $p->id,
                    $p->date_paiement,
                    $p->eleve?->matricule_eleve,
                    $p->eleve?->nom_eleve . ' ' . $p->eleve?->prenoms_eleve,
                    $p->eleve?->classe?->nom_classe,
                    $p->eleve?->classe?->niveau?->libelle_niveau,
                    $p->scolarite?->libelle_echeance,
                    $p->montant_paye,
                    $modes[$p->mode_paiement] ?? $p->mode_paiement,
                    $p->reference_paiement,
                ], ';');
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
