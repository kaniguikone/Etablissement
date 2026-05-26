<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Assiduites;
use App\Models\Classe;
use App\Models\DecisionConseil;
use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Etablissement;
use App\Models\Note;
use App\Models\Niveau;
use App\Models\Periodes;
use App\Models\Salle;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RapportMinistereController extends Controller
{
    /**
     * Génère le rapport statistique annuel pour le Ministère.
     * POST /api/rapport-ministere
     *
     * Body JSON:
     *   annee           string    ex. "2025-2026"
     *   bepc_inscrits   int|null
     *   bepc_admis      int|null
     *   bac_inscrits    int|null
     *   bac_admis       int|null
     */
    public function telecharger(Request $request)
    {
        ini_set('memory_limit', '512M');
        set_time_limit(300);

        $request->validate(['annee' => 'required|string|max:20']);
        $annee = $request->input('annee');

        $examens = [
            'bepc_inscrits' => $request->integer('bepc_inscrits'),
            'bepc_admis'    => $request->integer('bepc_admis'),
            'bac_inscrits'  => $request->integer('bac_inscrits'),
            'bac_admis'     => $request->integer('bac_admis'),
        ];

        $etablissement = Etablissement::first();
        $periodes      = Periodes::where('annee', $annee)->orderBy('date_debut')->get();

        $effectifs      = $this->sectionEffectifs();
        $personnel      = $this->sectionPersonnel();
        $resultats      = $this->sectionResultats($periodes);
        $assiduite      = $this->sectionAssiduite($periodes);
        $infrastructure = $this->sectionInfrastructure($effectifs['total']);

        $pdf = Pdf::loadView('rapports.ministere', compact(
            'etablissement', 'annee', 'periodes',
            'effectifs', 'personnel', 'resultats', 'assiduite', 'infrastructure', 'examens'
        ))->setPaper('A4', 'portrait');

        $nomFichier = 'rapport_statistique_' . str_replace('/', '-', $annee) . '.pdf';

        return $pdf->download($nomFichier);
    }

    // ── Section 1 : Effectifs élèves ──────────────────────────────────────────

    private function sectionEffectifs(): array
    {
        $niveaux = Niveau::orderBy('ordre')->get();

        $parNiveau = $niveaux->map(function ($niveau) {
            $eleves = Eleve::whereHas('classe', fn($q) => $q->where('niveau_id', $niveau->id))
                ->get(['genre_eleve', 'date_naissance_eleve']);

            $garcons = $eleves->whereIn('genre_eleve', ['M', 'm', 'Masculin', 'masculin'])->count();

            return [
                'nom'     => $niveau->nom_niveau,
                'total'   => $eleves->count(),
                'garcons' => $garcons,
                'filles'  => $eleves->count() - $garcons,
            ];
        });

        $total   = $parNiveau->sum('total');
        $garcons = $parNiveau->sum('garcons');

        // Tranches d'âge
        $now = now()->year;
        $tranches = Eleve::get(['date_naissance_eleve'])->groupBy(function ($e) use ($now) {
            if (!$e->date_naissance_eleve) return 'Inconnu';
            $age = $now - (int) substr($e->date_naissance_eleve, 0, 4);
            if ($age < 12)      return '< 12 ans';
            if ($age <= 14)     return '12-14 ans';
            if ($age <= 17)     return '15-17 ans';
            if ($age <= 20)     return '18-20 ans';
            return '> 20 ans';
        })->map->count();

        return [
            'par_niveau' => $parNiveau,
            'total'      => $total,
            'garcons'    => $garcons,
            'filles'     => $total - $garcons,
            'tranches'   => $tranches,
        ];
    }

    // ── Section 2 : Personnel enseignant ──────────────────────────────────────

    private function sectionPersonnel(): array
    {
        $enseignants = Enseignant::all(['genre_enseignant']);
        $total       = $enseignants->count();
        $hommes      = $enseignants->whereIn('genre_enseignant', ['M', 'm', 'Masculin'])->count();

        $parMatiere = DB::table('classe_enseignant_matiere as cem')
            ->join('matieres', 'cem.matiere_id', '=', 'matieres.id')
            ->select('matieres.libelle_matiere', DB::raw('COUNT(DISTINCT cem.enseignant_id) as nb'))
            ->groupBy('matieres.id', 'matieres.libelle_matiere')
            ->orderByDesc('nb')
            ->limit(15)
            ->get();

        $totalEleves     = Eleve::count();
        $tauxEncadrement = $total > 0 ? round($totalEleves / $total, 1) : 0;

        return compact('total', 'hommes', 'parMatiere', 'tauxEncadrement') + ['femmes' => $total - $hommes];
    }

    // ── Section 3 : Résultats scolaires ───────────────────────────────────────

    private function sectionResultats($periodes): array
    {
        if ($periodes->isEmpty()) {
            return [];
        }

        $periodeIds      = $periodes->pluck('id')->toArray();
        $derniereperiode = $periodes->last();
        $niveaux         = Niveau::with('classes.eleves')->orderBy('ordre')->get();
        $lignes          = [];

        foreach ($niveaux as $niveau) {
            foreach ($niveau->classes as $classe) {
                $eleveIds = $classe->eleves->pluck('id')->toArray();
                if (empty($eleveIds)) {
                    continue;
                }

                // Moyenne générale par élève (sur toutes les périodes de l'année)
                $moyennesParEleve = Note::join('devoirs', 'notes.devoir_id', '=', 'devoirs.id')
                    ->whereIn('devoirs.periode_id', $periodeIds)
                    ->whereIn('notes.eleve_id', $eleveIds)
                    ->select('notes.eleve_id', DB::raw('ROUND(AVG(notes.note), 2) as moyenne'))
                    ->groupBy('notes.eleve_id')
                    ->pluck('moyenne', 'eleve_id');

                $avecNote        = $moyennesParEleve->count();
                $admisCount      = $moyennesParEleve->filter(fn($m) => (float) $m >= 10)->count();
                $tauxReussite    = $avecNote > 0 ? round($admisCount / $avecNote * 100) : 0;
                $moyenneClasse   = $avecNote > 0 ? round($moyennesParEleve->avg(), 2) : null;

                // Décisions du conseil (dernière période)
                $decisions = DecisionConseil::whereIn('eleve_id', $eleveIds)
                    ->where('periode_id', $derniereperiode->id)
                    ->selectRaw('decision, COUNT(*) as nb')
                    ->groupBy('decision')
                    ->pluck('nb', 'decision');

                $lignes[] = [
                    'niveau'         => $niveau->nom_niveau,
                    'classe'         => $classe->nom_classe,
                    'effectif'       => count($eleveIds),
                    'avec_note'      => $avecNote,
                    'moyenne'        => $moyenneClasse,
                    'admis'          => $admisCount,
                    'echoue'         => $avecNote - $admisCount,
                    'taux_reussite'  => $tauxReussite,
                    'redoublants'    => (int) ($decisions->get('redoublement', 0)),
                ];
            }
        }

        return $lignes;
    }

    // ── Section 4 : Assiduité ────────────────────────────────────────────────

    private function sectionAssiduite($periodes): array
    {
        if ($periodes->isEmpty()) {
            return [];
        }

        $periodeIds = $periodes->pluck('id')->toArray();
        $niveaux    = Niveau::with('classes.eleves')->orderBy('ordre')->get();
        $lignes     = [];

        foreach ($niveaux as $niveau) {
            foreach ($niveau->classes as $classe) {
                $eleveIds = $classe->eleves->pluck('id')->toArray();
                if (empty($eleveIds)) {
                    continue;
                }

                $absences = Assiduites::whereIn('eleve_id', $eleveIds)
                    ->whereIn('periode_id', $periodeIds)
                    ->where('statut', 'absent')
                    ->count();

                $lignes[] = [
                    'niveau'       => $niveau->nom_niveau,
                    'classe'       => $classe->nom_classe,
                    'effectif'     => count($eleveIds),
                    'absences'     => $absences,
                    'moy_absences' => count($eleveIds) > 0 ? round($absences / count($eleveIds), 1) : 0,
                ];
            }
        }

        return $lignes;
    }

    // ── Section 5 : Infrastructure ────────────────────────────────────────────

    private function sectionInfrastructure(int $totalEleves): array
    {
        $salles         = Salle::where('actif', true)->get(['nom', 'capacite', 'type']);
        $capaciteTotale = (int) $salles->sum('capacite');
        $totalClasses   = Classe::count();

        return [
            'nb_salles'       => $salles->count(),
            'capacite_totale' => $capaciteTotale,
            'total_classes'   => $totalClasses,
            'taux_occupation' => $capaciteTotale > 0 ? round($totalEleves / $capaciteTotale * 100) : 0,
        ];
    }
}
