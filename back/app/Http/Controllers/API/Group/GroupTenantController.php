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
            'tenant' => $tenant->only(['id', 'nom', 'ville', 'actif']),
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
     * Détail complet d'un enseignant : pédagogie, programme, emploi du temps.
     */
    public function profDetail(Request $request, string $id, int $enseignantId): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($id);

        $periodeId = $request->query('periode_id');

        tenancy()->initialize($tenant);

        // Infos de base
        $ens = \DB::table('enseignants')->where('id', $enseignantId)->first();
        if (!$ens) {
            tenancy()->end();
            return response()->json(['message' => 'Enseignant introuvable.'], 404);
        }

        // Paires classe/matière de l'enseignant
        $paires = \DB::table('classe_enseignant_matiere')
            ->join('classes',  'classes.id',  '=', 'classe_enseignant_matiere.classe_id')
            ->join('matieres', 'matieres.id', '=', 'classe_enseignant_matiere.matiere_id')
            ->where('enseignant_id', $enseignantId)
            ->select('classe_enseignant_matiere.classe_id', 'classe_enseignant_matiere.matiere_id',
                     'classes.abbr_classe', 'classes.nom_classe', 'matieres.libelle_matiere')
            ->get();

        // Types de devoirs
        $typesDevoirs = \DB::table('type_devoirs')
            ->select('id', 'code_type_devoir', 'description_type_devoir')
            ->get()
            ->keyBy('id');

        // ── Onglet A : Pédagogie par classe ──────────────────────────────────
        $pedagogie = $paires->groupBy('classe_id')->map(function ($items) use ($periodeId, $typesDevoirs) {
            $item       = $items->first();
            $classeId   = $item->classe_id;
            $matiereIds = $items->pluck('matiere_id')->unique()->toArray();

            $qD = \DB::table('devoirs')
                ->whereIn('matiere_id', $matiereIds)
                ->where('classe_id', $classeId)
                ->when($periodeId, fn($q) => $q->where('periode_id', $periodeId));

            $devoirs   = (clone $qD)->get();
            $devoirIds = $devoirs->pluck('id');

            $parType = $devoirs->groupBy('type_devoir_id')->map(fn($d) => [
                'type'       => $typesDevoirs[$d->first()->type_devoir_id]->code_type_devoir ?? '—',
                'nb'         => $d->count(),
                'avec_notes' => \DB::table('notes')->whereIn('devoir_id', $d->pluck('id'))->distinct('devoir_id')->count('devoir_id'),
            ])->values();

            $nbDevoirs    = $devoirs->count();
            $devoirsNotes = \DB::table('notes')->whereIn('devoir_id', $devoirIds)->distinct('devoir_id')->count('devoir_id');
            $tauxSaisie   = $nbDevoirs > 0 ? round(($devoirsNotes / $nbDevoirs) * 100, 1) : 0;

            return [
                'classe_id'   => $classeId,
                'abbr_classe' => $item->abbr_classe,
                'nom_classe'  => $item->nom_classe,
                'matieres'    => $items->pluck('libelle_matiere')->unique()->values(),
                'nb_devoirs'  => $nbDevoirs,
                'taux_saisie' => $tauxSaisie,
                'par_type'    => $parType,
            ];
        })->values();

        // ── Onglet B : Suivi programme par classe ─────────────────────────────
        $programme = $paires->groupBy('classe_id')->map(function ($items) use ($enseignantId, $periodeId) {
            $item       = $items->first();
            $classeId   = $item->classe_id;
            $matiereIds = $items->pluck('matiere_id')->unique()->toArray();

            // Niveau de la classe (les chapitres sont définis par matière ET par niveau)
            $niveauId = \DB::table('classes')->where('id', $classeId)->value('niveau_id');

            // Tous les chapitres définis pour ces matières et ce niveau (source de vérité)
            $tousChapitres = \DB::table('chapitres_matiere')
                ->join('matieres', 'matieres.id', '=', 'chapitres_matiere.matiere_id')
                ->whereIn('chapitres_matiere.matiere_id', $matiereIds)
                ->where('chapitres_matiere.niveau_id', $niveauId)
                ->select('chapitres_matiere.id as chapitre_id', 'chapitres_matiere.titre',
                         'chapitres_matiere.ordre', 'matieres.libelle_matiere')
                ->orderBy('matieres.libelle_matiere')
                ->orderBy('chapitres_matiere.ordre')
                ->get();

            // Dernière progression par chapitre (pour cet enseignant / classe / période)
            $progMap = \DB::table('progressions')
                ->where('enseignant_id', $enseignantId)
                ->where('classe_id', $classeId)
                ->when($periodeId, fn($q) => $q->where('periode_id', $periodeId))
                ->select('chapitre_id', 'statut', 'date_seance')
                ->orderBy('date_seance', 'desc')
                ->get()
                ->groupBy('chapitre_id')
                ->map(fn($rows) => $rows->first());

            // Fusion : chaque chapitre reçoit son statut (null = non commencé)
            $chapitresEnrichis = $tousChapitres->map(fn($ch) => [
                'titre'            => $ch->titre,
                'statut'           => $progMap[$ch->chapitre_id]->statut ?? null,
                'date'             => $progMap[$ch->chapitre_id]->date_seance ?? null,
                'libelle_matiere'  => $ch->libelle_matiere,
            ]);

            $parMatiere = $chapitresEnrichis->groupBy('libelle_matiere')->map(fn($rows, $mat) => [
                'matiere'   => $mat,
                'fait'      => $rows->where('statut', 'fait')->count(),
                'en_cours'  => $rows->where('statut', 'en_cours')->count(),
                'reporte'   => $rows->where('statut', 'reporte')->count(),
                'chapitres' => $rows->map(fn($r) => [
                    'titre'  => $r['titre'],
                    'statut' => $r['statut'],
                    'date'   => $r['date'],
                ])->values(),
            ])->values();

            return [
                'classe_id'      => $classeId,
                'abbr_classe'    => $item->abbr_classe,
                'nom_classe'     => $item->nom_classe,
                'par_matiere'    => $parMatiere,
                'total_fait'     => $chapitresEnrichis->where('statut', 'fait')->count(),
                'total_en_cours' => $chapitresEnrichis->where('statut', 'en_cours')->count(),
                'total_reporte'  => $chapitresEnrichis->where('statut', 'reporte')->count(),
            ];
        })->values();

        // ── Onglet C : Emploi du temps ────────────────────────────────────────
        $jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        $creneaux = \DB::table('emploi_du_temps')
            ->join('classes',  'classes.id',  '=', 'emploi_du_temps.classe_id')
            ->join('matieres', 'matieres.id', '=', 'emploi_du_temps.matiere_id')
            ->leftJoin('salles', 'salles.id', '=', 'emploi_du_temps.salle_id')
            ->where('emploi_du_temps.enseignant_id', $enseignantId)
            ->select(
                'emploi_du_temps.id',
                'emploi_du_temps.jour',
                'emploi_du_temps.heure_debut',
                'emploi_du_temps.heure_fin',
                'classes.abbr_classe',
                'matieres.libelle_matiere',
                'salles.nom as nom_salle'
            )
            ->get()
            ->groupBy('jour')
            ->sortKeysUsing(fn($a, $b) => array_search($a, $jours) <=> array_search($b, $jours));

        $emploiDuTemps = collect($jours)->mapWithKeys(fn($j) => [
            $j => ($creneaux[$j] ?? collect())->sortBy('heure_debut')->values()
        ]);

        tenancy()->end();

        return response()->json([
            'enseignant' => [
                'id'     => $ens->id,
                'nom'    => $ens->nom_enseignant . ' ' . $ens->prenoms_enseignant,
                'statut' => $ens->statut_enseignant,
                'email'  => $ens->email_enseignant,
                'tel'    => $ens->telephone_enseignant,
            ],
            'pedagogie'     => $pedagogie,
            'programme'     => $programme,
            'emploi_du_temps' => $emploiDuTemps,
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
            ->get();

        // Matières par enseignant (depuis la DB tenant)
        $matiereParEns = \DB::table('classe_enseignant_matiere')
            ->select('enseignant_id', 'matiere_id')
            ->distinct()
            ->get()
            ->groupBy('enseignant_id')
            ->map(fn($rows) => $rows->pluck('matiere_id')->unique()->values());

        // Liste globale des matières présentes dans le tenant
        $matiereIds = \DB::table('classe_enseignant_matiere')->distinct()->pluck('matiere_id');
        $matieres = \DB::table('matieres')
            ->whereIn('id', $matiereIds)
            ->select('id', 'libelle_matiere')
            ->orderBy('libelle_matiere')
            ->get();

        // Périodes (trimestres) du tenant
        $periodes = \DB::table('periodes')
            ->select('id', 'libelle_periode', 'abbr_libelle_periode', 'annee', 'date_debut', 'date_fin')
            ->orderBy('date_debut', 'desc')
            ->get();

        $result = $enseignants->map(fn($e) => [
            'id'       => $e->id,
            'nom'      => $e->nom_enseignant . ' ' . $e->prenoms_enseignant,
            'statut'   => $e->statut_enseignant,
            'matieres' => $matiereParEns[$e->id] ?? [],
        ]);

        tenancy()->end();

        return response()->json([
            'enseignants' => $result,
            'matieres'    => $matieres,
            'periodes'    => $periodes,
        ]);
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
            'tenant'      => $tenant->only(['id', 'nom', 'ville', 'actif']),
            'mois'        => $mois,
            'enseignants' => $result->values(),
        ]);
    }

    /**
     * Liste légère : classes + élèves + périodes pour les filtres cascade.
     */
    public function listeEleves(Request $request, string $id): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($id);

        tenancy()->initialize($tenant);

        $classes = \DB::table('classes')
            ->select('id', 'abbr_classe', 'nom_classe', 'niveau_id')
            ->orderBy('abbr_classe')
            ->get();

        $eleves = \DB::table('eleves')
            ->select('id', 'nom_eleve', 'prenoms_eleve', 'classe_id', 'statut_eleve')
            ->orderBy('nom_eleve')
            ->get()
            ->map(fn($e) => [
                'id'       => $e->id,
                'nom'      => $e->nom_eleve . ' ' . $e->prenoms_eleve,
                'classe_id'=> $e->classe_id,
                'statut'   => $e->statut_eleve,
            ]);

        $periodes = \DB::table('periodes')
            ->select('id', 'libelle_periode', 'abbr_libelle_periode', 'annee', 'date_debut', 'date_fin')
            ->orderBy('date_debut', 'desc')
            ->get();

        tenancy()->end();

        return response()->json([
            'classes'  => $classes,
            'eleves'   => $eleves,
            'periodes' => $periodes,
        ]);
    }

    /**
     * Détail complet d'un élève : notes, assiduité, finances.
     */
    public function eleveDetail(Request $request, string $id, int $eleveId): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($id);

        $periodeId = $request->query('periode_id');

        tenancy()->initialize($tenant);

        // Infos élève
        $e = \DB::table('eleves')
            ->join('classes', 'eleves.classe_id', '=', 'classes.id')
            ->where('eleves.id', $eleveId)
            ->select('eleves.id', 'eleves.nom_eleve', 'eleves.prenoms_eleve',
                     'eleves.statut_eleve',
                     'classes.abbr_classe', 'classes.nom_classe', 'classes.niveau_id')
            ->first();

        if (!$e) {
            tenancy()->end();
            return response()->json(['message' => 'Élève introuvable.'], 404);
        }

        // ── Notes par matière ─────────────────────────────────────────────────
        $notesRaw = \DB::table('notes')
            ->join('devoirs',      'notes.devoir_id',       '=', 'devoirs.id')
            ->join('matieres',     'matieres.id',           '=', 'devoirs.matiere_id')
            ->join('type_devoirs', 'type_devoirs.id',       '=', 'devoirs.type_devoir_id')
            ->where('notes.eleve_id', $eleveId)
            ->when($periodeId, fn($q) => $q->where('devoirs.periode_id', $periodeId))
            ->select(
                'matieres.libelle_matiere',
                'type_devoirs.code_type_devoir as type',
                'devoirs.date_devoir',
                'notes.note'
            )
            ->orderBy('matieres.libelle_matiere')
            ->orderBy('devoirs.date_devoir')
            ->get();

        $notes = $notesRaw->groupBy('libelle_matiere')->map(fn($rows, $mat) => [
            'matiere'  => $mat,
            'moyenne'  => round($rows->avg('note'), 2),
            'nb_notes' => $rows->count(),
            'devoirs'  => $rows->map(fn($r) => [
                'type'  => $r->type,
                'note'  => (float) $r->note,
                'date'  => $r->date_devoir,
            ])->values(),
        ])->values();

        // ── Assiduité par matière ─────────────────────────────────────────────
        $assRaw = \DB::table('assiduites')
            ->join('matieres', 'matieres.id', '=', 'assiduites.matiere_id')
            ->where('assiduites.eleve_id', $eleveId)
            ->when($periodeId, function ($q) use ($periodeId) {
                $periode = \DB::table('periodes')->where('id', $periodeId)->first();
                if ($periode) {
                    $q->whereBetween('assiduites.date_assiduite', [$periode->date_debut, $periode->date_fin]);
                }
            })
            ->select(
                'matieres.libelle_matiere',
                'assiduites.statut',
                'assiduites.date_assiduite'
            )
            ->orderBy('matieres.libelle_matiere')
            ->orderBy('assiduites.date_assiduite')
            ->get();

        $assiduite = $assRaw->groupBy('libelle_matiere')->map(fn($rows, $mat) => [
            'matiere'  => $mat,
            'absences' => $rows->where('statut', 'absent')->count(),
            'retards'  => $rows->where('statut', 'retard')->count(),
            'details'  => $rows->whereIn('statut', ['absent', 'retard'])->map(fn($r) => [
                'statut' => $r->statut,
                'date'   => $r->date_assiduite,
            ])->values(),
        ])->values();

        // ── Finances ──────────────────────────────────────────────────────────
        $du = (float) \DB::table('scolarites')
            ->where('niveau_id', $e->niveau_id)
            ->sum('montant_echeance');

        $paiements = \DB::table('paiements')
            ->where('eleve_id', $eleveId)
            ->select('montant_paye', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        $totalPaye = (float) $paiements->sum('montant_paye');
        $reste     = max(0, $du - $totalPaye);

        tenancy()->end();

        return response()->json([
            'eleve' => [
                'id'         => $e->id,
                'nom'        => $e->nom_eleve . ' ' . $e->prenoms_eleve,
                'statut'     => $e->statut_eleve,
                'abbr_classe'=> $e->abbr_classe,
                'nom_classe' => $e->nom_classe,
            ],
            'notes'     => $notes,
            'assiduite' => $assiduite,
            'finances'  => [
                'total_du'   => $du,
                'total_paye' => $totalPaye,
                'reste'      => $reste,
                'a_jour'     => $totalPaye >= $du,
                'paiements'  => $paiements->map(fn($p) => [
                    'montant' => (float) $p->montant_paye,
                    'date'    => $p->created_at,
                ])->values(),
            ],
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
            'tenant' => $tenant->only(['id', 'nom', 'ville', 'actif']),
            'mois'   => $mois,
            'eleves' => $result->values(),
        ]);
    }
}
