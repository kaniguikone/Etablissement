<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Assiduites;
use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Note;
use App\Models\Niveau;
use App\Models\Paiement;
use App\Models\Periodes;
use App\Models\Scolarites;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatistiquesController extends Controller
{
    // ────────────────────────────────────────────────────────────────────────────
    // KPIs globaux (bandeau haut de page)
    // ────────────────────────────────────────────────────────────────────────────
    public function synthese(Request $request)
    {
        $periodeId = $request->query('periode_id');
        $user      = $request->user();

        $data = [];

        if ($user->peutFaire('pedagogie')) {
            // ── Taux de présence global ──────────────────────────────────────
            $qAss = Assiduites::query();
            if ($periodeId) $qAss->where('periode_id', $periodeId);
            $totalPointages  = $qAss->count();
            $totalAbsences   = (clone $qAss)->where('statut', 'absent')->count();
            $totalRetards    = (clone $qAss)->where('statut', 'retard')->count();

            $data['taux_presence_global'] = $totalPointages > 0
                ? round((($totalPointages - $totalAbsences) / $totalPointages) * 100, 1)
                : null;
            $data['total_absences'] = $totalAbsences;
            $data['total_retards']  = $totalRetards;

            // ── Moyenne générale + distribution ──────────────────────────────
            $notesQuery = DB::table('notes')
                ->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
                ->when($periodeId, fn($q) => $q->where('devoirs.periode_id', $periodeId));

            $stats = (clone $notesQuery)->selectRaw('
                ROUND(AVG(notes.note), 2) as moyenne_generale,
                COUNT(*) as nb_notes_total,
                SUM(CASE WHEN notes.note < 8 THEN 1 ELSE 0 END) as nb_moins_8,
                SUM(CASE WHEN notes.note >= 8 AND notes.note < 10 THEN 1 ELSE 0 END) as nb_8_10,
                SUM(CASE WHEN notes.note >= 10 THEN 1 ELSE 0 END) as nb_10_plus
            ')->first();

            $data['moyenne_generale']  = $stats->moyenne_generale ? (float) $stats->moyenne_generale : null;
            $data['nb_notes_total']    = (int) $stats->nb_notes_total;
            $data['distribution_notes'] = [
                'moins_8'  => (int) $stats->nb_moins_8,
                'entre_8_10' => (int) $stats->nb_8_10,
                'dix_plus'   => (int) $stats->nb_10_plus,
            ];

            // ── Élèves en difficulté (moyenne < 8 dans au moins une matière) ─
            $elevesDifficulte = DB::table('notes')
                ->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
                ->when($periodeId, fn($q) => $q->where('devoirs.periode_id', $periodeId))
                ->groupBy('notes.eleve_id', 'devoirs.matiere_id')
                ->havingRaw('AVG(notes.note) < 8')
                ->select('notes.eleve_id')
                ->distinct()
                ->get()->count();

            $data['nb_eleves_difficulte'] = $elevesDifficulte;
        }

        if ($user->peutFaire('finances')) {
            // ── Finances globales ────────────────────────────────────────────
            $totalDu = (float) DB::table('scolarites')
                ->join('niveaux', 'scolarites.niveau_id', '=', 'niveaux.id')
                ->join('classes', 'classes.niveau_id', '=', 'niveaux.id')
                ->join('eleves', 'eleves.classe_id', '=', 'classes.id')
                ->sum('scolarites.montant_echeance');

            $totalEncaisse = (float) Paiement::confirmes()->sum('montant_paye');
            $montantRestant = max(0, $totalDu - $totalEncaisse);

            $data['taux_recouvrement_global'] = $totalDu > 0
                ? round(($totalEncaisse / $totalDu) * 100, 1)
                : 0;
            $data['total_du_global']        = $totalDu;
            $data['total_encaisse_global']  = $totalEncaisse;
            $data['montant_restant_global'] = $montantRestant;
        }

        return response()->json($data);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Assiduité : par classe + top absences par matière
    // ────────────────────────────────────────────────────────────────────────────
    public function presences(Request $request)
    {
        $periodeId = $request->query('periode_id');

        // ── Par classe ──────────────────────────────────────────────────────
        $classes = Classe::with('niveau:id,abbr_niveau')->withCount('eleves')
            ->orderBy('abbr_classe')->get();

        $parClasse = $classes->map(function ($classe) use ($periodeId) {
            $q = Assiduites::whereHas('eleve', fn($sq) => $sq->where('classe_id', $classe->id));
            if ($periodeId) $q->where('periode_id', $periodeId);

            $total    = $q->count();
            $absences = (clone $q)->where('statut', 'absent')->count();
            $retards  = (clone $q)->where('statut', 'retard')->count();
            $presents = $total - $absences - $retards;

            return [
                'classe'          => $classe->abbr_classe,
                'nom_classe'      => $classe->nom_classe,
                'niveau'          => $classe->niveau?->abbr_niveau,
                'nb_eleves'       => $classe->eleves_count,
                'total_pointages' => $total,
                'presents'        => $presents,
                'absences'        => $absences,
                'retards'         => $retards,
                'taux_presence'   => $total > 0 ? round(($presents / $total) * 100, 1) : null,
                'taux_absence'    => $total > 0 ? round(($absences / $total) * 100, 1) : null,
            ];
        })->filter(fn($c) => $c['total_pointages'] > 0)->values();

        // ── Par matière ─────────────────────────────────────────────────────
        $parMatiere = DB::table('assiduites')
            ->join('matieres', 'assiduites.matiere_id', '=', 'matieres.id')
            ->when($periodeId, fn($q) => $q->where('assiduites.periode_id', $periodeId))
            ->groupBy('matieres.id', 'matieres.abbr_matiere', 'matieres.libelle_matiere')
            ->select(
                'matieres.abbr_matiere as matiere',
                'matieres.libelle_matiere as libelle',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN statut = "absent" THEN 1 ELSE 0 END) as absences'),
                DB::raw('SUM(CASE WHEN statut = "retard" THEN 1 ELSE 0 END) as retards'),
                DB::raw('ROUND(SUM(CASE WHEN statut = "absent" THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as taux_absence')
            )
            ->orderBy('absences', 'desc')
            ->get();

        return response()->json([
            'par_classe'  => $parClasse,
            'par_matiere' => $parMatiere,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Résultats : moyennes par matière + par classe + distribution
    // ────────────────────────────────────────────────────────────────────────────
    public function moyennes(Request $request)
    {
        $periodeId = $request->query('periode_id');

        // ── Par matière avec distribution ────────────────────────────────────
        $parMatiere = DB::table('notes')
            ->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
            ->join('matieres', 'devoirs.matiere_id', '=', 'matieres.id')
            ->when($periodeId, fn($q) => $q->where('devoirs.periode_id', $periodeId))
            ->groupBy('matieres.id', 'matieres.abbr_matiere', 'matieres.libelle_matiere')
            ->select(
                'matieres.abbr_matiere as matiere',
                'matieres.libelle_matiere as libelle',
                DB::raw('ROUND(AVG(notes.note), 2) as moyenne'),
                DB::raw('COUNT(notes.id) as nb_notes'),
                DB::raw('SUM(CASE WHEN notes.note < 8 THEN 1 ELSE 0 END) as nb_moins_8'),
                DB::raw('SUM(CASE WHEN notes.note >= 8 AND notes.note < 10 THEN 1 ELSE 0 END) as nb_8_10'),
                DB::raw('SUM(CASE WHEN notes.note >= 10 THEN 1 ELSE 0 END) as nb_10_plus')
            )
            ->orderBy('moyenne', 'desc')
            ->get();

        // ── Par classe ───────────────────────────────────────────────────────
        $parClasse = DB::table('notes')
            ->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
            ->join('classes', 'devoirs.classe_id', '=', 'classes.id')
            ->when($periodeId, fn($q) => $q->where('devoirs.periode_id', $periodeId))
            ->whereNotNull('devoirs.classe_id')
            ->groupBy('classes.id', 'classes.abbr_classe', 'classes.nom_classe')
            ->select(
                'classes.abbr_classe as classe',
                'classes.nom_classe',
                DB::raw('ROUND(AVG(notes.note), 2) as moyenne'),
                DB::raw('COUNT(DISTINCT notes.eleve_id) as nb_eleves'),
                DB::raw('SUM(CASE WHEN notes.note < 8 THEN 1 ELSE 0 END) as nb_moins_8'),
                DB::raw('SUM(CASE WHEN notes.note >= 10 THEN 1 ELSE 0 END) as nb_10_plus')
            )
            ->orderBy('moyenne', 'desc')
            ->get();

        return response()->json([
            'par_matiere' => $parMatiere,
            'par_classe'  => $parClasse,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Finances : par niveau + par échéance
    // ────────────────────────────────────────────────────────────────────────────
    public function finances()
    {
        // ── Par niveau avec élèves à jour/en retard ──────────────────────────
        $niveaux = Niveau::with('scolarites')->orderBy('nom_niveau')->get();

        $parNiveau = $niveaux->map(function ($niveau) {
            $eleveIds      = Eleve::whereHas('classe', fn($q) => $q->where('niveau_id', $niveau->id))->pluck('id');
            $nbEleves      = $eleveIds->count();
            $montantTotal  = $niveau->scolarites->sum('montant_echeance');
            $totalDu       = $montantTotal * $nbEleves;
            $totalEncaisse = (float) Paiement::whereIn('eleve_id', $eleveIds)->confirmes()->sum('montant_paye');
            $taux          = $totalDu > 0 ? round(($totalEncaisse / $totalDu) * 100, 1) : 0;

            // Élèves à jour = ont payé au moins autant que le montant total dû
            $paiementsParEleve = Paiement::whereIn('eleve_id', $eleveIds)
                ->confirmes()
                ->select('eleve_id', DB::raw('SUM(montant_paye) as total_paye'))
                ->groupBy('eleve_id')->get()->keyBy('eleve_id');

            $aJour = $enRetard = 0;
            foreach ($eleveIds as $id) {
                $paye = (float) ($paiementsParEleve[$id]?->total_paye ?? 0);
                if ($paye >= $montantTotal) $aJour++; else $enRetard++;
            }

            return [
                'niveau'          => $niveau->abbr_niveau,
                'libelle'         => $niveau->nom_niveau,
                'nb_eleves'       => $nbEleves,
                'montant_du'      => $totalDu,
                'total_encaisse'  => $totalEncaisse,
                'taux'            => $taux,
                'eleves_a_jour'   => $aJour,
                'eleves_en_retard'=> $enRetard,
            ];
        })->filter(fn($n) => $n['nb_eleves'] > 0)->values();

        // ── Par échéance (toutes échéances confondues) ───────────────────────
        $echeances = Scolarites::with('niveau:id,abbr_niveau')
            ->orderBy('date_echeance')
            ->get()
            ->map(function ($ech) {
                $eleveIds = Eleve::whereHas('classe', fn($q) => $q->where('niveau_id', $ech->niveau_id))->pluck('id');
                $nbEleves      = $eleveIds->count();
                $totalDu       = $ech->montant_echeance * $nbEleves;
                $totalEncaisse = (float) Paiement::whereIn('eleve_id', $eleveIds)
                    ->where('scolarite_id', $ech->id)->confirmes()->sum('montant_paye');
                $taux = $totalDu > 0 ? round(($totalEncaisse / $totalDu) * 100, 1) : 0;

                return [
                    'echeance'       => $ech->libelle_echeance,
                    'niveau'         => $ech->niveau?->abbr_niveau,
                    'montant_unitaire'=> $ech->montant_echeance,
                    'nb_eleves'      => $nbEleves,
                    'total_du'       => $totalDu,
                    'total_encaisse' => $totalEncaisse,
                    'taux'           => $taux,
                    'date_echeance'  => $ech->date_echeance,
                ];
            })->filter(fn($e) => $e['nb_eleves'] > 0)->values();

        return response()->json([
            'par_niveau'   => $parNiveau,
            'par_echeance' => $echeances,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Évolution inter-périodes : moyenne de la classe par période
    // ────────────────────────────────────────────────────────────────────────────
    public function evolution(Request $request)
    {
        $classeId = $request->query('classe_id');
        $niveauId = $request->query('niveau_id');

        $periodes = Periodes::orderBy('date_debut')->get();

        // Déterminer les élèves concernés
        $eleveQuery = Eleve::query();
        if ($classeId) {
            $eleveQuery->where('classe_id', $classeId);
        } elseif ($niveauId) {
            $eleveQuery->whereHas('classe', fn($q) => $q->where('niveau_id', $niveauId));
        }
        $eleveIds = $eleveQuery->pluck('id');

        $courbes = $periodes->map(function ($periode) use ($eleveIds, $classeId, $niveauId) {
            // Moyennes par matière pour cette période
            $parMatiere = DB::table('notes')
                ->join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
                ->join('matieres', 'devoirs.matiere_id', '=', 'matieres.id')
                ->where('devoirs.periode_id', $periode->id)
                ->whereIn('notes.eleve_id', $eleveIds)
                ->groupBy('matieres.id', 'matieres.abbr_matiere')
                ->select(
                    'matieres.abbr_matiere as matiere',
                    DB::raw('ROUND(AVG(notes.note), 2) as moyenne')
                )->get();

            $moyGen = $parMatiere->avg('moyenne');

            return [
                'periode'     => $periode->abbr_libelle_periode,
                'periode_id'  => $periode->id,
                'moyenne_gen' => $moyGen ? round($moyGen, 2) : null,
                'par_matiere' => $parMatiere,
            ];
        })->filter(fn($p) => $p['moyenne_gen'] !== null)->values();

        return response()->json($courbes);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Classement des élèves dans une classe pour une période
    // ────────────────────────────────────────────────────────────────────────────
    public function classement(Request $request)
    {
        $request->validate([
            'classe_id'  => 'required|exists:classes,id',
            'periode_id' => 'required|exists:periodes,id',
        ]);

        $classeId  = $request->query('classe_id');
        $periodeId = $request->query('periode_id');
        $classe    = Classe::with('niveau')->findOrFail($classeId);
        $periode   = Periodes::findOrFail($periodeId);
        $niveauId  = $classe->niveau_id;

        $eleves = Eleve::where('classe_id', $classeId)->orderBy('nom_eleve')->get();

        $resultats = $eleves->map(function ($eleve) use ($periodeId, $classeId, $niveauId) {
            $notes = Note::with('devoir.matiere')
                ->whereHas('devoir', function ($q) use ($periodeId, $classeId, $niveauId) {
                    $q->where('periode_id', $periodeId)
                      ->where(function ($q2) use ($classeId, $niveauId) {
                          $q2->where('classe_id', $classeId)->orWhere('niveau_id', $niveauId);
                      });
                })
                ->where('eleve_id', $eleve->id)
                ->get();

            $parMatiere = $notes->groupBy(fn($n) => $n->devoir->matiere->libelle_matiere)
                ->map(function ($nm) {
                    $coeff = $nm->sum(fn($n) => $n->devoir->coeff_devoir);
                    $somme = $nm->sum(fn($n) => $n->note * $n->devoir->coeff_devoir);
                    return $coeff > 0 ? round($somme / $coeff, 2) : null;
                })->filter();

            $moyGen = $parMatiere->count() > 0
                ? round($parMatiere->avg(), 2)
                : null;

            return [
                'eleve_id'   => $eleve->id,
                'nom'        => $eleve->nom_eleve . ' ' . $eleve->prenoms_eleve,
                'matricule'  => $eleve->matricule_eleve,
                'moyenne'    => $moyGen,
                'nb_matieres'=> $parMatiere->count(),
                'mention'    => $this->mention($moyGen),
            ];
        })
        ->filter(fn($r) => $r['moyenne'] !== null)
        ->sortByDesc('moyenne')
        ->values()
        ->map(function ($r, $i) {
            $r['rang'] = $i + 1;
            return $r;
        });

        return response()->json([
            'classe'    => $classe,
            'periode'   => $periode,
            'classement'=> $resultats,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Stats par enseignant : charge de travail + notes saisies
    // ────────────────────────────────────────────────────────────────────────────
    public function enseignants(Request $request)
    {
        $periodeId = $request->query('periode_id');

        $enseignants = Enseignant::orderBy('nom_enseignant')->get();

        $data = $enseignants->map(function ($ens) use ($periodeId) {
            // Les devoirs de l'enseignant = devoirs dont (matiere_id, classe_id)
            // correspond à ses affectations dans classe_enseignant_matiere
            $affectations = DB::table('classe_enseignant_matiere')
                ->where('enseignant_id', $ens->id)
                ->get(['classe_id', 'matiere_id']);

            if ($affectations->isEmpty()) {
                return null;
            }

            $devoirsQuery = DB::table('devoirs');
            $devoirsQuery->where(function ($q) use ($affectations) {
                foreach ($affectations as $aff) {
                    $q->orWhere(function ($q2) use ($aff) {
                        $q2->where('classe_id', $aff->classe_id)
                           ->where('matiere_id', $aff->matiere_id);
                    });
                }
            });

            if ($periodeId) {
                $devoirsQuery->where('periode_id', $periodeId);
            }

            $devoirIds = $devoirsQuery->pluck('id');
            $nbDevoirs = $devoirIds->count();

            if ($nbDevoirs === 0) return null;

            $nbNotesSaisies  = Note::whereIn('devoir_id', $devoirIds)->count();
            $nbElevesEvalues = Note::whereIn('devoir_id', $devoirIds)
                ->distinct('eleve_id')->count('eleve_id');
            $moyenneNotes    = Note::whereIn('devoir_id', $devoirIds)->avg('note');

            return [
                'enseignant_id'     => $ens->id,
                'nom'               => $ens->nom_enseignant . ' ' . $ens->prenoms_enseignant,
                'nb_devoirs'        => $nbDevoirs,
                'nb_notes_saisies'  => $nbNotesSaisies,
                'nb_eleves_evalues' => $nbElevesEvalues,
                'moyenne_classe'    => $moyenneNotes ? round($moyenneNotes, 2) : null,
            ];
        })->filter()->values();

        return response()->json($data);
    }

    private function mention(?float $moy): string
    {
        if ($moy === null) return '—';
        if ($moy >= 16)   return 'Très bien';
        if ($moy >= 14)   return 'Bien';
        if ($moy >= 12)   return 'Assez bien';
        if ($moy >= 10)   return 'Passable';
        return 'Insuffisant';
    }
}
