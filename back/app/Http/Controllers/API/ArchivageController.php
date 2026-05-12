<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\Classe;
use App\Models\DecisionConseil;
use App\Models\Eleve;
use App\Models\EmploiDuTemps;
use App\Models\Niveau;
use App\Models\Paiement;
use App\Models\PassageClasse;
use App\Models\Periodes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
     * Bloque si des décisions de conseil sont manquantes pour la dernière période.
     * POST /api/annees-scolaires/{id}/initier-cloture
     */
    public function initierCloture(int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);

        if (!$annee->estModifiable()) {
            return response()->json(['message' => 'Cette année ne peut pas être mise en clôture (statut : ' . $annee->statut . ').'], 422);
        }

        $prerequis = $this->verifierPrerequisData($annee);
        if (!$prerequis['pret']) {
            return response()->json([
                'message' => 'Des décisions de conseil de classe sont manquantes. Toutes les classes doivent avoir leurs décisions saisies pour la dernière période avant de clôturer.',
                'details' => $prerequis,
            ], 422);
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
     * Confirme la clôture définitive.
     * Dérive automatiquement les passages depuis les décisions du conseil de la dernière période.
     * POST /api/annees-scolaires/{id}/confirmer
     */
    public function confirmer(int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);

        if (!$annee->estEnCloture()) {
            return response()->json(['message' => 'L\'année doit être en statut "en_cloture" pour être confirmée.'], 422);
        }

        $dernierePeriode = Periodes::where('annee_scolaire_id', $annee->id)->orderBy('id')->get()->last();
        if (!$dernierePeriode) {
            return response()->json(['message' => 'Aucune période trouvée pour cette année scolaire.'], 422);
        }

        // Backup avant toute modification (non bloquant)
        $backup = $this->effectuerBackup($annee);
        if (!$backup['success']) {
            Log::warning('Clôture poursuivie malgré l\'échec du backup automatique.', ['annee' => $annee->libelle, 'raison' => $backup['message']]);
        }

        $niveaux           = Niveau::with(['classes' => fn($q) => $q->orderBy('num_classe')])->get();
        $classeSuivanteMap = $this->construireMapClasseSuivante($niveaux);

        try {
            DB::transaction(function () use ($annee, $dernierePeriode, $classeSuivanteMap) {
                $eleves    = Eleve::where('statut_eleve', 'actif')->get();
                $decisions = DecisionConseil::whereIn('eleve_id', $eleves->pluck('id'))
                    ->where('periode_id', $dernierePeriode->id)
                    ->get()
                    ->keyBy('eleve_id');

                foreach ($eleves as $eleve) {
                    $decisionConseil = $decisions->get($eleve->id)?->decision;
                    [$decision, $classeSuivanteId] = $this->mapperDecision($decisionConseil, $eleve->classe_id, $classeSuivanteMap);

                    PassageClasse::updateOrCreate(
                        ['annee_scolaire_id' => $annee->id, 'eleve_id' => $eleve->id],
                        [
                            'classe_actuelle_id' => $eleve->classe_id,
                            'classe_suivante_id' => $classeSuivanteId,
                            'decision'           => $decision,
                            'applique'           => true,
                        ]
                    );

                    $updateEleve = ['statut_eleve' => 'actif'];
                    if ($decision === 'diplome') {
                        $updateEleve['statut_eleve'] = 'diplome';
                    } elseif ($decision === 'sorti') {
                        $updateEleve['statut_eleve'] = 'sorti';
                    } elseif ($classeSuivanteId) {
                        $updateEleve['classe_id'] = $classeSuivanteId;
                    }
                    $eleve->update($updateEleve);
                }

                $annee->update(['statut' => 'cloturee']);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Échec de la confirmation de clôture. Aucune modification appliquée.',
            ], 500);
        }

        return response()->json([
            'message' => 'Clôture confirmée. Les passages de classe ont été appliqués. L\'année est maintenant archivée.',
            'annee'   => $annee->fresh(),
            'backup'  => $backup,
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

        try {
            $nouvelleAnnee = DB::transaction(function () use ($request) {
                $annee = AnneeScolaire::create([
                    'libelle'    => $request->libelle,
                    'date_debut' => $request->date_debut,
                    'date_fin'   => $request->date_fin,
                    'statut'     => 'en_cours',
                ]);

                if ($request->boolean('vider_emploi_du_temps', true)) {
                    EmploiDuTemps::whereNull('annee_scolaire_id')->delete();
                }

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
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Échec de l\'initialisation de la nouvelle année. Aucune modification enregistrée.',
            ], 500);
        }

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
    // ── PRÉREQUIS & BILAN PRÉVISIONNEL ────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Vérifie que toutes les classes ont leurs décisions de conseil saisies pour la dernière période.
     * GET /api/annees-scolaires/{id}/prerequis
     */
    public function prerequis(int $id)
    {
        $annee = AnneeScolaire::findOrFail($id);
        return response()->json($this->verifierPrerequisData($annee));
    }

    /**
     * Calcule le bilan prévisionnel des passages depuis les décisions du conseil, sans rien appliquer.
     * GET /api/annees-scolaires/{id}/bilan-preview
     */
    public function bilanPreview(int $id)
    {
        $annee           = AnneeScolaire::findOrFail($id);
        $dernierePeriode = Periodes::where('annee_scolaire_id', $annee->id)->orderBy('id')->get()->last();

        $niveaux           = Niveau::with(['classes' => fn($q) => $q->orderBy('num_classe')])->get();
        $classeSuivanteMap = $this->construireMapClasseSuivante($niveaux);

        $eleves    = Eleve::with('classe')->where('statut_eleve', 'actif')->get();
        $decisions = $dernierePeriode
            ? DecisionConseil::whereIn('eleve_id', $eleves->pluck('id'))
                ->where('periode_id', $dernierePeriode->id)
                ->get()->keyBy('eleve_id')
            : collect();

        $stats  = ['promu' => 0, 'redoublant' => 0, 'diplome' => 0, 'sorti' => 0];
        $detail = [];

        foreach ($eleves as $eleve) {
            $decisionConseil = $decisions->get($eleve->id)?->decision;
            [$decision] = $this->mapperDecision($decisionConseil, $eleve->classe_id, $classeSuivanteMap);
            $stats[$decision]++;
            $detail[] = [
                'nom'              => $eleve->nom_eleve . ' ' . $eleve->prenoms_eleve,
                'matricule'        => $eleve->matricule_eleve,
                'classe_actuelle'  => $eleve->classe->nom_classe ?? '—',
                'decision_conseil' => $decisionConseil,
                'decision_passage' => $decision,
            ];
        }

        return response()->json([
            'annee'            => $annee,
            'derniere_periode' => $dernierePeriode?->only(['id', 'libelle_periode', 'abbr_libelle_periode']),
            'stats'            => $stats,
            'detail'           => $detail,
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
                $map[$classe->id] = $classeSuivanteNiveau?->id;
            }
        }

        return $map;
    }

    /**
     * Vérifie que chaque classe active a une décision de conseil pour la dernière période.
     */
    private function verifierPrerequisData(AnneeScolaire $annee): array
    {
        $dernierePeriode = Periodes::where('annee_scolaire_id', $annee->id)->orderBy('id')->get()->last();

        if (!$dernierePeriode) {
            return [
                'pret'    => false,
                'message' => 'Aucune période définie pour cette année scolaire.',
                'classes' => [],
            ];
        }

        $classes = Classe::with(['eleves' => fn($q) => $q->where('statut_eleve', 'actif')])->get();
        $rapport = [];
        $toutOk  = true;

        foreach ($classes as $classe) {
            $elevesActifs = $classe->eleves;
            if ($elevesActifs->isEmpty()) {
                continue;
            }

            $elevesIds           = $elevesActifs->pluck('id');
            $decisionsExistantes = DecisionConseil::whereIn('eleve_id', $elevesIds)
                ->where('periode_id', $dernierePeriode->id)
                ->whereNotNull('decision')
                ->pluck('eleve_id');

            $nbManquants = $elevesIds->diff($decisionsExistantes)->count();
            if ($nbManquants > 0) {
                $toutOk = false;
            }

            $rapport[] = [
                'classe_id'    => $classe->id,
                'classe'       => $classe->nom_classe,
                'nb_eleves'    => $elevesActifs->count(),
                'nb_decisions' => $decisionsExistantes->count(),
                'nb_manquants' => $nbManquants,
                'ok'           => $nbManquants === 0,
            ];
        }

        return [
            'pret'             => $toutOk,
            'derniere_periode' => $dernierePeriode->only(['id', 'libelle_periode', 'abbr_libelle_periode']),
            'classes'          => $rapport,
        ];
    }

    /**
     * Mappe une décision du conseil vers une décision de passage et la classe suivante.
     * Si l'élève est en dernière classe du dernier niveau (pas de classe suivante dans le map),
     * il est automatiquement diplômé, sauf en cas de redoublement ou exclusion explicite.
     */
    private function mapperDecision(?string $decisionConseil, int $classeId, array $classeSuivanteMap): array
    {
        $classeSuivanteId = $classeSuivanteMap[$classeId] ?? null;

        return match ($decisionConseil) {
            'redoublement' => ['redoublant', $classeId],
            'exclu'        => ['sorti', null],
            default        => $classeSuivanteId !== null
                ? ['promu', $classeSuivanteId]
                : ['diplome', null],
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── BACKUP ────────────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Crée un dump de la base de données courante avant la clôture définitive.
     * Non bloquant : en cas d'échec, l'erreur est loggée mais la clôture peut continuer.
     */
    private function effectuerBackup(AnneeScolaire $annee): array
    {
        try {
            $connection = DB::connection();
            $driver     = $connection->getDriverName();
            $timestamp  = now()->format('Y-m-d_H-i-s');
            $slug       = preg_replace('/[^a-zA-Z0-9_-]/', '_', $annee->libelle);
            $filename   = "backup_{$slug}_{$timestamp}";
            $backupDir  = storage_path('app/backups');

            if (!is_dir($backupDir)) {
                mkdir($backupDir, 0755, true);
            }

            return match ($driver) {
                'mysql', 'mariadb' => $this->backupMysql($connection, $filename, $backupDir),
                'sqlite'           => $this->backupSqlite($connection, $filename, $backupDir),
                default            => ['success' => false, 'message' => "Driver non supporté pour le backup automatique : {$driver}"],
            };
        } catch (\Throwable $e) {
            Log::error('Backup pré-clôture échoué', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    private function backupMysql($connection, string $filename, string $backupDir): array
    {
        $config   = $connection->getConfig();
        $host     = $config['host']     ?? '127.0.0.1';
        $port     = $config['port']     ?? 3306;
        $database = $connection->getDatabaseName();
        $username = $config['username'] ?? '';
        $password = $config['password'] ?? '';

        $filepath = "{$backupDir}/{$filename}.sql";

        // MYSQL_PWD évite que le mot de passe apparaisse dans la liste des processus.
        $env = $password !== '' ? 'MYSQL_PWD=' . escapeshellarg($password) . ' ' : '';

        $cmd = sprintf(
            '%smysqldump -h %s -P %d -u %s --result-file=%s %s 2>&1',
            $env,
            escapeshellarg($host),
            (int) $port,
            escapeshellarg($username),
            escapeshellarg($filepath),
            escapeshellarg($database),
        );

        exec($cmd, $output, $exitCode);

        if ($exitCode !== 0 || !file_exists($filepath)) {
            $detail = implode(' ', $output);
            Log::error('mysqldump échoué', ['cmd_exit' => $exitCode, 'output' => $detail]);
            return ['success' => false, 'message' => "mysqldump a échoué (code {$exitCode}). Vérifiez que mysqldump est installé sur le serveur."];
        }

        return [
            'success' => true,
            'fichier' => basename($filepath),
            'taille'  => round(filesize($filepath) / 1024, 1) . ' Ko',
        ];
    }

    private function backupSqlite($connection, string $filename, string $backupDir): array
    {
        $dbPath   = $connection->getDatabaseName();
        $filepath = "{$backupDir}/{$filename}.sqlite";

        if (!copy($dbPath, $filepath)) {
            Log::error('Backup SQLite échoué', ['source' => $dbPath, 'dest' => $filepath]);
            return ['success' => false, 'message' => 'Impossible de copier le fichier SQLite.'];
        }

        return [
            'success' => true,
            'fichier' => basename($filepath),
            'taille'  => round(filesize($filepath) / 1024, 1) . ' Ko',
        ];
    }
}
