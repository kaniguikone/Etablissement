<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\Classe;
use App\Models\Eleve;
use App\Models\EmploiDuTemps;
use App\Models\Niveau;
use App\Models\Paiement;
use App\Models\PassageClasse;
use App\Models\Periodes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ArchivageController extends Controller
{
    // ══════════════════════════════════════════════════════════════════════════
    // ── ANNÉES SCOLAIRES ──────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Liste de toutes les années scolaires (+ infos de base).
     * GET /api/annees-scolaires
     */
    public function index()
    {
        $annees = AnneeScolaire::withCount('periodes')
            ->orderBy('date_debut', 'desc')
            ->get();

        return response()->json($annees);
    }

    /**
     * Créer une nouvelle année scolaire (devient automatiquement en_cours).
     * POST /api/annees-scolaires
     */
    public function store(Request $request)
    {
        $request->validate([
            'libelle'    => 'required|string|max:20|unique:annees_scolaires,libelle',
            'date_debut' => 'required|date',
            'date_fin'   => 'required|date|after:date_debut',
        ]);

        // S'il existe déjà une année en cours, on refuse (on doit d'abord la clôturer)
        if (AnneeScolaire::where('statut', 'en_cours')->exists()) {
            return response()->json([
                'message' => 'Une année scolaire est déjà en cours. Clôturez-la avant d\'en créer une nouvelle.',
            ], 422);
        }

        $annee = AnneeScolaire::create([
            'libelle'    => $request->libelle,
            'date_debut' => $request->date_debut,
            'date_fin'   => $request->date_fin,
            'statut'     => 'en_cours',
        ]);

        return response()->json($annee, 201);
    }

    /**
     * Détail d'une année scolaire.
     * GET /api/annees-scolaires/{id}
     */
    public function show(int $id)
    {
        $annee = AnneeScolaire::withCount('periodes')->findOrFail($id);
        return response()->json($annee);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── ÉTAPE 1 : INITIER LA CLÔTURE ─────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Passer une année en statut "en_cloture" (lecture seule, rollback possible).
     * POST /api/annees-scolaires/{id}/initier-cloture
     */
    public function initierCloture(int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);

        if (!$annee->estModifiable()) {
            return response()->json(['message' => 'Cette année ne peut pas être mise en clôture (statut : ' . $annee->statut . ').'], 422);
        }

        $annee->update(['statut' => 'en_cloture']);

        return response()->json([
            'message' => 'Clôture initiée. Les saisies sont maintenant en lecture seule. Vous pouvez annuler via /rollback.',
            'annee'   => $annee->fresh(),
        ]);
    }

    /**
     * Annuler la clôture : repasse en "en_cours".
     * POST /api/annees-scolaires/{id}/rollback
     */
    public function rollback(int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);

        if (!$annee->estEnCloture()) {
            return response()->json(['message' => 'Seule une année "en_cloture" peut être annulée.'], 422);
        }

        // Supprimer les passages non encore appliqués
        PassageClasse::where('annee_scolaire_id', $annee->id)
            ->where('applique', false)
            ->delete();

        $annee->update(['statut' => 'en_cours']);

        return response()->json(['message' => 'Clôture annulée. L\'année est de nouveau en cours.', 'annee' => $annee->fresh()]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── ÉTAPE 2 : PASSAGE DE CLASSE ──────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Retourne le tableau de passage : tous les élèves actifs groupés par classe,
     * avec une suggestion automatique (promu vers la classe suivante par défaut).
     * GET /api/annees-scolaires/{id}/passage
     */
    public function passage(int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);

        if (!$annee->estEnCloture()) {
            return response()->json(['message' => 'L\'année doit être en clôture pour accéder au passage de classes.'], 422);
        }

        // Niveaux ordonnés (on suppose que les classes sont ordonnées par nom ou ID au sein du niveau)
        $niveaux = Niveau::with(['classes' => fn ($q) => $q->orderBy('num_classe')])->get();

        // Mapping niveau → classe suivante (classe du niveau suivant dans le même ordre)
        $classeSuivanteMap = $this->construireMapClasseSuivante($niveaux);

        // Passages déjà enregistrés
        $passagesExistants = PassageClasse::where('annee_scolaire_id', $annee->id)
            ->get()
            ->keyBy('eleve_id');

        $eleves = Eleve::with(['classe.niveau'])
            ->where('statut_eleve', 'actif')
            ->get();

        $data = $eleves->groupBy('classe_id')->map(function ($elevesClasse) use ($classeSuivanteMap, $passagesExistants, $annee) {
            return $elevesClasse->map(function (Eleve $eleve) use ($classeSuivanteMap, $passagesExistants, $annee) {
                $passage = $passagesExistants->get($eleve->id);
                $classeSuggereId = $classeSuivanteMap[$eleve->classe_id] ?? null;

                return [
                    'eleve_id'          => $eleve->id,
                    'matricule'         => $eleve->matricule_eleve,
                    'nom'               => $eleve->nom_eleve,
                    'prenoms'           => $eleve->prenoms_eleve,
                    'classe_actuelle_id'=> $eleve->classe_id,
                    'classe_actuelle'   => $eleve->classe->nom_classe ?? '—',
                    'niveau'            => $eleve->classe->niveau->nom_niveau ?? '—',
                    // Valeurs enregistrées ou suggestions
                    'passage_id'        => $passage?->id,
                    'decision'          => $passage?->decision ?? 'promu',
                    'classe_suivante_id'=> $passage?->classe_suivante_id ?? $classeSuggereId,
                    'remarque'          => $passage?->remarque,
                ];
            })->values();
        });

        // Toutes les classes pour les selects
        $classes = Classe::with('niveau')->orderBy('nom_classe')->get()
            ->map(fn ($c) => [
                'id'      => $c->id,
                'libelle' => $c->nom_classe . ($c->niveau ? ' (' . $c->niveau->nom_niveau . ')' : ''),
            ]);

        return response()->json([
            'annee'           => $annee,
            'eleves_par_classe' => $data,
            'classes'         => $classes,
        ]);
    }

    /**
     * Enregistrer / mettre à jour les décisions de passage pour un ou plusieurs élèves.
     * PUT /api/annees-scolaires/{id}/passage
     */
    public function enregistrerPassage(Request $request, int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);

        if (!$annee->estEnCloture()) {
            return response()->json(['message' => 'L\'année doit être en clôture.'], 422);
        }

        $request->validate([
            'passages'                       => 'required|array',
            'passages.*.eleve_id'            => 'required|exists:eleves,id',
            'passages.*.decision'            => 'required|in:promu,redoublant,diplome,sorti',
            'passages.*.classe_suivante_id'  => 'nullable|exists:classes,id',
            'passages.*.remarque'            => 'nullable|string|max:255',
        ]);

        foreach ($request->passages as $item) {
            $eleve = Eleve::findOrFail($item['eleve_id']);

            // Les diplômés/sortis n'ont pas de classe suivante
            $classeSuivanteId = in_array($item['decision'], ['diplome', 'sorti'])
                ? null
                : ($item['classe_suivante_id'] ?? $eleve->classe_id);

            PassageClasse::updateOrCreate(
                ['annee_scolaire_id' => $annee->id, 'eleve_id' => $eleve->id],
                [
                    'classe_actuelle_id' => $eleve->classe_id,
                    'classe_suivante_id' => $classeSuivanteId,
                    'decision'           => $item['decision'],
                    'remarque'           => $item['remarque'] ?? null,
                    'applique'           => false,
                ]
            );
        }

        return response()->json(['message' => 'Décisions de passage enregistrées.']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── ÉTAPE 3 : CONFIRMER ET APPLIQUER ─────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Confirme la clôture définitive :
     * - Applique les passages de classe sur les élèves
     * - Passe l'année en statut "cloturee"
     *
     * POST /api/annees-scolaires/{id}/confirmer
     */
    public function confirmer(int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);

        if (!$annee->estEnCloture()) {
            return response()->json(['message' => 'L\'année doit être en statut "en_cloture" pour être confirmée.'], 422);
        }

        // Vérifier que tous les élèves actifs ont un passage enregistré
        $elevesActifs = Eleve::where('statut_eleve', 'actif')->count();
        $passagesEnregistres = PassageClasse::where('annee_scolaire_id', $annee->id)->count();

        if ($elevesActifs > 0 && $passagesEnregistres === 0) {
            return response()->json([
                'message' => 'Aucune décision de passage n\'a été enregistrée. Veuillez renseigner le tableau de passage avant de confirmer.',
            ], 422);
        }

        DB::transaction(function () use ($annee) {
            $passages = PassageClasse::where('annee_scolaire_id', $annee->id)
                ->where('applique', false)
                ->with('eleve')
                ->get();

            foreach ($passages as $passage) {
                $eleve = $passage->eleve;

                // Appliquer la décision
                $updateEleve = ['statut_eleve' => 'actif'];

                if ($passage->decision === 'diplome') {
                    $updateEleve['statut_eleve'] = 'diplome';
                } elseif ($passage->decision === 'sorti') {
                    $updateEleve['statut_eleve'] = 'sorti';
                } elseif ($passage->classe_suivante_id) {
                    $updateEleve['classe_id'] = $passage->classe_suivante_id;
                }
                // redoublant → reste dans la même classe, statut reste actif

                $eleve->update($updateEleve);
                $passage->update(['applique' => true]);
            }

            $annee->update(['statut' => 'cloturee']);
        });

        return response()->json([
            'message' => 'Clôture confirmée. Les passages de classe ont été appliqués. L\'année est maintenant archivée.',
            'annee'   => $annee->fresh(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── ÉTAPE 4 : INITIALISER LA NOUVELLE ANNÉE ──────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Initialise la nouvelle année :
     * - Crée l'année scolaire (si non fournie)
     * - Vide l'emploi du temps
     * - Remet les élèves diplômés/sortis en statut final (déjà fait à la confirmation)
     * - Optionnel : crée 3 périodes par défaut
     *
     * POST /api/annees-scolaires/init-nouvelle-annee
     */
    public function initNouvelleAnnee(Request $request)
    {
        $request->validate([
            'libelle'              => 'required|string|max:20|unique:annees_scolaires,libelle',
            'date_debut'           => 'required|date',
            'date_fin'             => 'required|date|after:date_debut',
            'vider_emploi_du_temps'=> 'boolean',
            'creer_periodes'       => 'boolean',
        ]);

        if (AnneeScolaire::where('statut', 'en_cours')->exists()) {
            return response()->json(['message' => 'Une année scolaire est déjà en cours.'], 422);
        }

        $nouvelleAnnee = DB::transaction(function () use ($request) {
            $annee = AnneeScolaire::create([
                'libelle'    => $request->libelle,
                'date_debut' => $request->date_debut,
                'date_fin'   => $request->date_fin,
                'statut'     => 'en_cours',
            ]);

            // Vider l'emploi du temps si demandé
            if ($request->boolean('vider_emploi_du_temps', true)) {
                EmploiDuTemps::whereNull('annee_scolaire_id')->delete();
            }

            // Créer 3 périodes par défaut si demandé
            if ($request->boolean('creer_periodes', false)) {
                $anneeLabel = $annee->libelle;
                $periodes = [
                    ['libelle_periode' => "1er Trimestre $anneeLabel", 'abbr_libelle_periode' => 'T1', 'code_periode' => 'T1'],
                    ['libelle_periode' => "2ème Trimestre $anneeLabel", 'abbr_libelle_periode' => 'T2', 'code_periode' => 'T2'],
                    ['libelle_periode' => "3ème Trimestre $anneeLabel", 'abbr_libelle_periode' => 'T3', 'code_periode' => 'T3'],
                ];
                foreach ($periodes as $p) {
                    Periodes::create([
                        ...$p,
                        'annee'             => $anneeLabel,
                        'annee_scolaire_id' => $annee->id,
                        'date_debut'        => $annee->date_debut,
                        'date_fin'          => $annee->date_fin,
                    ]);
                }
            }

            return $annee;
        });

        return response()->json([
            'message' => 'Nouvelle année scolaire initialisée avec succès.',
            'annee'   => $nouvelleAnnee->load('periodes'),
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── BILAN CLÔTURE ────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Retourne un bilan : élèves promus, redoublants, diplômés, chiffres clés.
     * GET /api/annees-scolaires/{id}/bilan
     */
    public function bilan(int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);

        $passages = PassageClasse::where('annee_scolaire_id', $annee->id)
            ->with(['eleve', 'classeActuelle', 'classeSuivante'])
            ->get();

        $stats = [
            'promu'      => $passages->where('decision', 'promu')->count(),
            'redoublant' => $passages->where('decision', 'redoublant')->count(),
            'diplome'    => $passages->where('decision', 'diplome')->count(),
            'sorti'      => $passages->where('decision', 'sorti')->count(),
            'total'      => $passages->count(),
        ];

        $detail = $passages->map(fn ($p) => [
            'eleve'           => $p->eleve->nom_eleve . ' ' . $p->eleve->prenoms_eleve,
            'matricule'       => $p->eleve->matricule_eleve,
            'classe_actuelle' => $p->classeActuelle->nom_classe ?? '—',
            'classe_suivante' => $p->classeSuivante->nom_classe ?? '—',
            'decision'        => $p->decision,
            'remarque'        => $p->remarque,
            'applique'        => $p->applique,
        ]);

        return response()->json([
            'annee'  => $annee,
            'stats'  => $stats,
            'detail' => $detail,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── UTILITAIRES ───────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Construit un mapping classe_id → classe_suivante_id.
     * Logique : pour chaque niveau, les classes sont ordonnées par num_classe.
     * La classe suivante est la première classe du niveau suivant (même ordre d'ID de niveau).
     */
    private function construireMapClasseSuivante($niveaux): array
    {
        $map = [];
        $niveauxOrdonnes = $niveaux->sortBy('id')->values();

        foreach ($niveauxOrdonnes as $idx => $niveau) {
            $classesNiveau = $niveau->classes->sortBy('num_classe')->values();
            $niveauSuivant = $niveauxOrdonnes->get($idx + 1);
            $classeSuivanteNiveau = $niveauSuivant?->classes->sortBy('num_classe')->first();

            foreach ($classesNiveau as $classe) {
                // Par défaut : première classe du niveau suivant
                $map[$classe->id] = $classeSuivanteNiveau?->id;
            }
        }

        return $map;
    }
}
