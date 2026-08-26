<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Assiduites;
use App\Models\Classe;
use App\Models\Devoir;
use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Informations;
use App\Models\Matiere;
use App\Models\Note;
use App\Models\Niveau;
use App\Models\Paiement;
use App\Models\Parents;
use App\Models\Periodes;
use App\Models\Scolarites;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user         = $request->user()->load('role');
        $debutSemaine = Carbon::now()->startOfWeek()->toDateString();

        // ── Résolution des périodes sélectionnées ────────────────────────────
        // Le frontend envoie ?periodes=1,2,3 (IDs séparés par virgule)
        $periodeIds = collect(explode(',', $request->query('periodes', '')))
            ->filter()
            ->map(fn($id) => (int) $id)
            ->all();

        // Si aucune sélection, on prend la plus récente par défaut
        if (empty($periodeIds)) {
            $derniere = Periodes::orderBy('date_debut', 'desc')->first();
            if ($derniere) $periodeIds = [$derniere->id];
        }

        $data = [
            'role_label'     => $user->role?->label ?? '—',
            'periode_active' => null, // non utilisé côté front (géré dans le dropdown)
        ];

        // ── Blocs selon les permissions ──────────────────────────────────────

        $voitEffectifs  = $user->peutFaire(['eleves', 'enseignants', 'parents', 'inscriptions', 'pedagogie']);
        $voitFinances   = $user->peutFaire('finances');
        $voitPedagogie  = $user->peutFaire('pedagogie');
        $voitAssiduites = $user->peutFaire('pedagogie');
        $voitInfos      = $user->peutFaire('communication');
        $voitAdmin      = $user->estSuperAdmin();

        // ── Effectifs ────────────────────────────────────────────────────────
        if ($voitEffectifs) {
            $data['total_eleves']      = Eleve::count();
            $data['total_enseignants'] = Enseignant::count();
            $data['total_classes']     = Classe::count();
            $data['total_matieres']    = Matiere::count();

            $data['eleves_par_niveau'] = Niveau::withCount(['classes as total_eleves' => function ($q) {
                $q->join('eleves', 'eleves.classe_id', '=', 'classes.id')
                  ->select(DB::raw('count(eleves.id)'));
            }])->get()->map(fn($n) => [
                'niveau'       => $n->abbr_niveau,
                'total_eleves' => (int) $n->total_eleves,
            ]);
        }

        if ($voitFinances && !$voitEffectifs) {
            $data['total_eleves'] = Eleve::count();
        }

        // ── Assiduité ────────────────────────────────────────────────────────
        if ($voitAssiduites) {
            $data['absences_semaine'] = Assiduites::where('statut', 'absent')
                ->where('date_assiduite', '>=', $debutSemaine)->count();

            $data['retards_semaine'] = Assiduites::where('statut', 'retard')
                ->where('date_assiduite', '>=', $debutSemaine)->count();

            $data['top_absents'] = Assiduites::select('eleve_id', DB::raw('count(*) as nb_absences'))
                ->where('statut', 'absent')
                ->when(!empty($periodeIds), fn($q) => $q->whereIn('periode_id', $periodeIds))
                ->groupBy('eleve_id')
                ->orderByDesc('nb_absences')
                ->limit(5)
                ->with('eleve:id,nom_eleve,prenoms_eleve')
                ->get()
                ->map(fn($a) => [
                    'eleve'       => $a->eleve?->nom_eleve . ' ' . $a->eleve?->prenoms_eleve,
                    'nb_absences' => $a->nb_absences,
                ]);
        }

        // ── Finances ─────────────────────────────────────────────────────────
        if ($voitFinances) {
            $totalDu = (float) DB::table('scolarites')
                ->join('niveaux', 'scolarites.niveau_id', '=', 'niveaux.id')
                ->join('classes', 'classes.niveau_id', '=', 'niveaux.id')
                ->join('eleves', 'eleves.classe_id', '=', 'classes.id')
                ->sum('scolarites.montant_echeance');

            $totalEncaisse    = (float) Paiement::confirmes()->sum('montant_paye');
            $tauxRecouvrement = $totalDu > 0 ? round(($totalEncaisse / $totalDu) * 100, 1) : 0;

            $elevesAvecPaiements = Paiement::confirmes()
                ->select('eleve_id', DB::raw('sum(montant_paye) as total_paye'))
                ->groupBy('eleve_id')->get()->keyBy('eleve_id');

            // Calcul en SQL : pour chaque niveau, montant dû = sum(scolarites) * nb_élèves
            $elevesAJour = $elevesEnRetard = 0;
            $dusParNiveau = \App\Models\Scolarites::select('niveau_id', \Illuminate\Support\Facades\DB::raw('sum(montant_echeance) as total_du'))
                ->groupBy('niveau_id')
                ->pluck('total_du', 'niveau_id');
            $niveauParEleve = Eleve::join('classes', 'eleves.classe_id', '=', 'classes.id')
                ->select('eleves.id', 'classes.niveau_id')
                ->pluck('niveau_id', 'id');

            foreach ($niveauParEleve as $eleveId => $niveauId) {
                $du   = (float) ($dusParNiveau[$niveauId] ?? 0);
                $paye = (float) ($elevesAvecPaiements[$eleveId]?->total_paye ?? 0);
                if ($paye >= $du) $elevesAJour++; else $elevesEnRetard++;
            }

            $data['total_du']           = $totalDu;
            $data['total_encaisse']     = $totalEncaisse;
            $data['taux_recouvrement']  = $tauxRecouvrement;
            $data['eleves_a_jour']      = $elevesAJour;
            $data['eleves_en_retard']   = $elevesEnRetard;

            $data['derniers_paiements'] = Paiement::with(['eleve:id,nom_eleve,prenoms_eleve', 'scolarite:id,libelle_echeance'])
                ->confirmes()
                ->orderBy('date_paiement', 'desc')->limit(5)->get()
                ->map(fn($p) => [
                    'eleve'    => $p->eleve?->nom_eleve . ' ' . $p->eleve?->prenoms_eleve,
                    'montant'  => (float) $p->montant_paye,
                    'echeance' => $p->scolarite?->libelle_echeance,
                    'date'     => $p->date_paiement,
                    'mode'     => $p->mode_paiement,
                ]);
        }

        // ── Pédagogie ────────────────────────────────────────────────────────
        if ($voitPedagogie) {
            $totalDevoirs = Devoir::when(!empty($periodeIds), fn($q) => $q->whereIn('periode_id', $periodeIds))->count();

            $devoirsAvecNotes = Devoir::when(!empty($periodeIds), fn($q) => $q->whereIn('periode_id', $periodeIds))
                ->whereHas('notes')->count();

            $data['total_devoirs']     = $totalDevoirs;
            $data['taux_saisie_notes'] = $totalDevoirs > 0 ? round(($devoirsAvecNotes / $totalDevoirs) * 100, 1) : 0;

            $data['devoirs_recents'] = Devoir::with(['matiere', 'classe', 'niveau', 'typeDevoir'])
                ->when(!empty($periodeIds), fn($q) => $q->whereIn('periode_id', $periodeIds))
                ->orderBy('date_devoir', 'desc')->limit(5)->get()
                ->map(fn($d) => [
                    'id'      => $d->id,
                    'type'    => $d->typeDevoir?->code_type_devoir,
                    'matiere' => $d->matiere?->abbr_matiere,
                    'classe'  => $d->classe?->abbr_classe ?? $d->niveau?->abbr_niveau,
                ]);
        }

        // ── Informations ─────────────────────────────────────────────────────
        if ($voitInfos) {
            $data['informations_recentes'] = Informations::orderBy('date_info', 'desc')
                ->limit(3)->get(['id', 'date_info', 'titre']);
        }

        // ── Administration ───────────────────────────────────────────────────
        if ($voitAdmin) {
            $data['total_utilisateurs']  = User::count();
            $data['utilisateurs_actifs'] = User::where('actif', true)->count();
        }

        // ── Inscriptions en attente ───────────────────────────────────────────
        if ($user->peutFaire('inscriptions')) {
            $data['inscriptions_en_attente'] = DB::table('demandes_inscription')
                ->where('statut', 'en_attente')->count();
        }

        return response()->json($data);
    }
}
