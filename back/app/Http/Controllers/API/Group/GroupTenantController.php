<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\Group;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupTenantController extends Controller
{
    /**
     * Liste des écoles du groupe connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $tenants = $request->user()->group
            ->tenants()
            ->with('domains')
            ->orderBy('nom')
            ->get();

        return response()->json($tenants);
    }

    /**
     * Détail d'une école (appartenant au groupe).
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $tenant = $request->user()->group
            ->tenants()
            ->with('domains')
            ->findOrFail($id);

        return response()->json($tenant);
    }

    /**
     * Stats détaillées d'une école spécifique.
     */
    public function stats(Request $request, string $id): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($id);

        $mois = $request->query('mois');
        if ($mois) {
            [$annee, $moisNum] = explode('-', $mois);
        }

        tenancy()->initialize($tenant);

        // Effectifs
        $eleves      = (int) \DB::table('eleves')->count();
        $enseignants = (int) \DB::table('enseignants')->count();
        $classes     = (int) \DB::table('classes')->count();
        $parents     = (int) \DB::table('parents')->count();

        // Finances
        $totalDu = (float) \DB::table('scolarites')
            ->join('classes', 'classes.niveau_id', '=', 'scolarites.niveau_id')
            ->join('eleves', 'eleves.classe_id', '=', 'classes.id')
            ->sum('scolarites.montant_echeance');

        $qPaiements = \DB::table('paiements');
        if ($mois) {
            $qPaiements->whereYear('created_at', $annee)->whereMonth('created_at', $moisNum);
        }
        $totalEncaisse       = (float) (clone $qPaiements)->sum('montant_paye');
        $totalEncaisseGlobal = (float) \DB::table('paiements')->sum('montant_paye');

        $tauxRecouvrement = $totalDu > 0 ? round(($totalEncaisseGlobal / $totalDu) * 100, 1) : 0;
        $impayes          = max(0, $totalDu - $totalEncaisseGlobal);

        // Élèves à jour / en retard
        $dusParNiveau = \DB::table('scolarites')
            ->select('niveau_id', \DB::raw('sum(montant_echeance) as total_du'))
            ->groupBy('niveau_id')
            ->pluck('total_du', 'niveau_id');

        $niveauParEleve = \DB::table('eleves')
            ->join('classes', 'eleves.classe_id', '=', 'classes.id')
            ->pluck('classes.niveau_id', 'eleves.id');

        $paiementsParEleve = \DB::table('paiements')
            ->select('eleve_id', \DB::raw('sum(montant_paye) as total_paye'))
            ->groupBy('eleve_id')
            ->pluck('total_paye', 'eleve_id');

        $elevesAJour = $elevesEnRetard = 0;
        foreach ($niveauParEleve as $eleveId => $niveauId) {
            $du   = (float) ($dusParNiveau[$niveauId] ?? 0);
            $paye = (float) ($paiementsParEleve[$eleveId] ?? 0);
            if ($paye >= $du) $elevesAJour++; else $elevesEnRetard++;
        }

        // Assiduités
        $qAss = \DB::table('assiduites');
        if ($mois) {
            $qAss->whereYear('date_assiduite', $annee)->whereMonth('date_assiduite', $moisNum);
        }
        $totalPointages = (int) (clone $qAss)->count();
        $totalAbsences  = (int) (clone $qAss)->where('statut', 'absent')->count();
        $totalRetards   = (int) (clone $qAss)->where('statut', 'retard')->count();
        $tauxPresence   = $totalPointages > 0
            ? round((($totalPointages - $totalAbsences) / $totalPointages) * 100, 1)
            : null;

        // Pédagogie / Notes
        $notesQuery = \DB::table('notes')->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id');
        if ($mois) {
            $notesQuery->whereYear('devoirs.created_at', $annee)->whereMonth('devoirs.created_at', $moisNum);
        }
        $statsNotes = (clone $notesQuery)
            ->selectRaw('ROUND(AVG(notes.note), 2) as moyenne_generale, COUNT(*) as nb_notes')
            ->first();

        $moyenneGenerale = $statsNotes->moyenne_generale ? (float) $statsNotes->moyenne_generale : null;
        $nbNotes         = (int) $statsNotes->nb_notes;

        $nbElevesDifficulte = \DB::table('notes')
            ->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
            ->when($mois, fn($q) => $q->whereYear('devoirs.created_at', $annee)->whereMonth('devoirs.created_at', $moisNum))
            ->groupBy('notes.eleve_id', 'devoirs.matiere_id')
            ->havingRaw('AVG(notes.note) < 8')
            ->select('notes.eleve_id')
            ->distinct()
            ->get()
            ->count();

        $totalDevoirs     = (int) \DB::table('devoirs')->count();
        $devoirsAvecNotes = (int) \DB::table('devoirs')
            ->whereExists(fn($q) => $q->from('notes')->whereColumn('notes.devoir_id', 'devoirs.id'))
            ->count();
        $tauxSaisieNotes  = $totalDevoirs > 0 ? round(($devoirsAvecNotes / $totalDevoirs) * 100, 1) : 0;

        tenancy()->end();

        return response()->json([
            'tenant' => $tenant->only(['id', 'nom', 'ville', 'plan', 'actif']),
            'mois'   => $mois,
            'stats'  => compact(
                'eleves', 'enseignants', 'classes', 'parents',
                'totalDu', 'totalEncaisse', 'tauxRecouvrement', 'impayes',
                'elevesAJour', 'elevesEnRetard',
                'totalAbsences', 'totalRetards', 'tauxPresence',
                'moyenneGenerale', 'nbNotes', 'nbElevesDifficulte',
                'totalDevoirs', 'tauxSaisieNotes'
            ),
        ]);
    }

    /**
     * Liste légère des enseignants d'une école (id + nom uniquement).
     */
    public function listeEnseignants(Request $request, string $id): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($id);

        tenancy()->initialize($tenant);

        $enseignants = \DB::table('enseignants')
            ->select('id', 'nom_enseignant', 'prenoms_enseignant', 'statut_enseignant')
            ->orderBy('nom_enseignant')
            ->get()
            ->map(fn($e) => [
                'id'  => $e->id,
                'nom' => $e->nom_enseignant . ' ' . $e->prenoms_enseignant,
                'statut' => $e->statut_enseignant,
            ]);

        tenancy()->end();

        return response()->json($enseignants);
    }

    /**
     * Activités des enseignants d'une école (devoirs, notes, absences signalées).
     */
    public function enseignants(Request $request, string $id): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($id);

        $mois    = $request->query('mois');
        $annee   = null;
        $moisNum = null;
        if ($mois) {
            [$annee, $moisNum] = explode('-', $mois);
        }

        tenancy()->initialize($tenant);

        $enseignants = \DB::table('enseignants')->get();

        $result = $enseignants->map(function ($ens) use ($mois, $annee, $moisNum) {
            // Matières distinctes
            $matieres = \DB::table('classe_enseignant_matiere')
                ->join('matieres', 'matieres.id', '=', 'classe_enseignant_matiere.matiere_id')
                ->where('enseignant_id', $ens->id)
                ->distinct()
                ->pluck('matieres.libelle_matiere')
                ->toArray();

            // Paires (classe_id, matiere_id) de l'enseignant
            $paires = \DB::table('classe_enseignant_matiere')
                ->where('enseignant_id', $ens->id)
                ->select('classe_id', 'matiere_id')
                ->get();

            $nbDevoirs  = 0;
            $nbNotes    = 0;
            $nbAbsences = 0;

            foreach ($paires as $p) {
                $qD = \DB::table('devoirs')
                    ->where('classe_id', $p->classe_id)
                    ->where('matiere_id', $p->matiere_id);
                if ($mois) {
                    $qD->whereYear('date_devoir', $annee)->whereMonth('date_devoir', $moisNum);
                }
                $devIds = $qD->pluck('id');
                $nbDevoirs += $devIds->count();
                $nbNotes   += \DB::table('notes')->whereIn('devoir_id', $devIds)->count();

                $qA = \DB::table('assiduites')
                    ->join('eleves', 'eleves.id', '=', 'assiduites.eleve_id')
                    ->where('assiduites.matiere_id', $p->matiere_id)
                    ->where('eleves.classe_id', $p->classe_id)
                    ->where('assiduites.statut', 'absent');
                if ($mois) {
                    $qA->whereYear('assiduites.date_assiduite', $annee)
                       ->whereMonth('assiduites.date_assiduite', $moisNum);
                }
                $nbAbsences += $qA->count();
            }

            // Classes enseignées
            $classes = \DB::table('classe_enseignant_matiere')
                ->join('classes', 'classes.id', '=', 'classe_enseignant_matiere.classe_id')
                ->where('enseignant_id', $ens->id)
                ->distinct()
                ->pluck('classes.abbr_classe')
                ->toArray();

            // Suivi de programme
            $qProg = \DB::table('progressions')->where('enseignant_id', $ens->id);
            if ($mois) {
                $qProg->whereYear('date_seance', $annee)->whereMonth('date_seance', $moisNum);
            }
            $progressions       = (clone $qProg)->get();
            $nbProgFait         = $progressions->where('statut', 'fait')->count();
            $nbProgEnCours      = $progressions->where('statut', 'en_cours')->count();
            $nbProgReporte      = $progressions->where('statut', 'reporte')->count();
            $nbChapitresCouvert = $progressions->pluck('chapitre_id')->unique()->count();

            // Détail par matière/classe (pour vue détaillée d'un prof)
            $detailProgramme = \DB::table('progressions')
                ->join('chapitres_matiere', 'chapitres_matiere.id', '=', 'progressions.chapitre_id')
                ->join('matieres', 'matieres.id', '=', 'chapitres_matiere.matiere_id')
                ->join('classes', 'classes.id', '=', 'progressions.classe_id')
                ->where('progressions.enseignant_id', $ens->id)
                ->when($mois, fn($q) => $q->whereYear('progressions.date_seance', $annee)->whereMonth('progressions.date_seance', $moisNum))
                ->select(
                    'matieres.libelle_matiere',
                    'classes.abbr_classe',
                    'chapitres_matiere.titre as chapitre',
                    'progressions.statut',
                    'progressions.date_seance'
                )
                ->orderBy('matieres.libelle_matiere')
                ->orderBy('classes.abbr_classe')
                ->orderBy('progressions.date_seance', 'desc')
                ->get()
                ->groupBy(fn($p) => $p->libelle_matiere . '||' . $p->abbr_classe)
                ->map(fn($items, $key) => [
                    'matiere' => $items->first()->libelle_matiere,
                    'classe'  => $items->first()->abbr_classe,
                    'fait'    => $items->where('statut', 'fait')->count(),
                    'en_cours'=> $items->where('statut', 'en_cours')->count(),
                    'reporte' => $items->where('statut', 'reporte')->count(),
                    'chapitres' => $items->pluck('chapitre')->unique()->values(),
                ])
                ->values();

            return [
                'id'                 => $ens->id,
                'nom'                => $ens->nom_enseignant . ' ' . $ens->prenoms_enseignant,
                'statut'             => $ens->statut_enseignant,
                'matieres'           => $matieres,
                'classes'            => $classes,
                'nb_devoirs'         => $nbDevoirs,
                'nb_notes'           => $nbNotes,
                'nb_absences'        => $nbAbsences,
                'nb_prog_fait'       => $nbProgFait,
                'nb_prog_en_cours'   => $nbProgEnCours,
                'nb_prog_reporte'    => $nbProgReporte,
                'nb_chapitres'       => $nbChapitresCouvert,
                'detail_programme'   => $detailProgramme,
            ];
        });

        tenancy()->end();

        return response()->json([
            'tenant'      => $tenant->only(['id', 'nom', 'ville', 'plan', 'actif']),
            'mois'        => $mois,
            'enseignants' => $result->values(),
        ]);
    }

    /**
     * Finances et activités des élèves d'une école.
     */
    public function eleves(Request $request, string $id): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($id);

        $mois    = $request->query('mois');
        $annee   = null;
        $moisNum = null;
        if ($mois) {
            [$annee, $moisNum] = explode('-', $mois);
        }

        tenancy()->initialize($tenant);

        // Montant dû par niveau
        $dusParNiveau = \DB::table('scolarites')
            ->select('niveau_id', \DB::raw('sum(montant_echeance) as total_du'))
            ->groupBy('niveau_id')
            ->pluck('total_du', 'niveau_id');

        // Paiements par élève
        $paiementsParEleve = \DB::table('paiements')
            ->select('eleve_id', \DB::raw('sum(montant_paye) as total_paye'))
            ->groupBy('eleve_id')
            ->pluck('total_paye', 'eleve_id');

        // Assiduités par élève (filtrées si mois)
        $absParEleve = \DB::table('assiduites')
            ->where('statut', 'absent')
            ->when($mois, fn($q) => $q->whereYear('date_assiduite', $annee)->whereMonth('date_assiduite', $moisNum))
            ->select('eleve_id', \DB::raw('count(*) as nb'))
            ->groupBy('eleve_id')
            ->pluck('nb', 'eleve_id');

        $retParEleve = \DB::table('assiduites')
            ->where('statut', 'retard')
            ->when($mois, fn($q) => $q->whereYear('date_assiduite', $annee)->whereMonth('date_assiduite', $moisNum))
            ->select('eleve_id', \DB::raw('count(*) as nb'))
            ->groupBy('eleve_id')
            ->pluck('nb', 'eleve_id');

        // Moyennes par élève
        $moyParEleve = \DB::table('notes')
            ->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
            ->when($mois, fn($q) => $q->whereYear('devoirs.date_devoir', $annee)->whereMonth('devoirs.date_devoir', $moisNum))
            ->select('notes.eleve_id', \DB::raw('ROUND(AVG(notes.note), 2) as moyenne'))
            ->groupBy('notes.eleve_id')
            ->pluck('moyenne', 'eleve_id');

        $eleves = \DB::table('eleves')
            ->join('classes', 'eleves.classe_id', '=', 'classes.id')
            ->select('eleves.id', 'eleves.nom_eleve', 'eleves.prenoms_eleve',
                     'classes.abbr_classe', 'classes.niveau_id', 'eleves.statut_eleve')
            ->orderBy('classes.abbr_classe')
            ->orderBy('eleves.nom_eleve')
            ->get();

        $result = $eleves->map(function ($e) use ($dusParNiveau, $paiementsParEleve, $absParEleve, $retParEleve, $moyParEleve) {
            $du    = (float) ($dusParNiveau[$e->niveau_id] ?? 0);
            $paye  = (float) ($paiementsParEleve[$e->id] ?? 0);
            $reste = max(0, $du - $paye);

            return [
                'id'       => $e->id,
                'nom'      => $e->nom_eleve . ' ' . $e->prenoms_eleve,
                'classe'   => $e->abbr_classe,
                'statut'   => $e->statut_eleve,
                // finances
                'total_du'   => $du,
                'total_paye' => $paye,
                'reste'      => $reste,
                'a_jour'     => $paye >= $du,
                // activités
                'absences'   => (int) ($absParEleve[$e->id] ?? 0),
                'retards'    => (int) ($retParEleve[$e->id] ?? 0),
                'moyenne'    => $moyParEleve[$e->id] ? (float) $moyParEleve[$e->id] : null,
            ];
        });

        tenancy()->end();

        return response()->json([
            'tenant' => $tenant->only(['id', 'nom', 'ville', 'plan', 'actif']),
            'mois'   => $mois,
            'eleves' => $result->values(),
        ]);
    }
}
