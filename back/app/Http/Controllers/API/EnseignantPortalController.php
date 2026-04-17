<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Assiduites;
use App\Models\ChapitreMatiere;
use App\Models\Classe;
use App\Models\Devoir;
use App\Models\Eleve;
use App\Models\EmploiDuTemps;
use App\Models\Informations;
use App\Models\Note;
use App\Models\Periodes;
use App\Models\Progression;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnseignantPortalController extends Controller
{
    // ── Profil & contexte ────────────────────────────────────────────────────

    /**
     * Classes et matières enseignées par l'enseignant connecté.
     * GET /api/enseignant/classes
     */
    public function classes(Request $request)
    {
        $enseignant = $request->user();

        $rows = DB::table('classe_enseignant_matiere as cem')
            ->join('classes as cl', 'cl.id', '=', 'cem.classe_id')
            ->join('matieres as m', 'm.id', '=', 'cem.matiere_id')
            ->leftJoin('niveaux as n', 'n.id', '=', 'cl.niveau_id')
            ->where('cem.enseignant_id', $enseignant->id)
            ->select(
                'cl.id as classe_id', 'cl.nom_classe', 'cl.abbr_classe',
                'm.id as matiere_id', 'm.libelle_matiere', 'm.abbr_matiere',
                'n.id as niveau_id', 'n.nom_niveau as libelle_niveau'
            )
            ->orderBy('cl.nom_classe')
            ->get();

        return response()->json($rows);
    }

    /**
     * Élèves d'une classe.
     * GET /api/enseignant/classe/{id}/eleves
     */
    public function eleves(Request $request, int $classeId)
    {
        $this->verifierAccesClasse($request->user()->id, $classeId);

        $eleves = Eleve::where('classe_id', $classeId)
            ->orderBy('nom_eleve')
            ->get()
            ->map(fn ($e) => [
                'id'         => $e->id,
                'matricule'  => $e->matricule_eleve,
                'nom'        => $e->nom_eleve,
                'prenoms'    => $e->prenoms_eleve,
                'photo_url'  => $e->photo_url,
            ]);

        return response()->json($eleves);
    }

    // ── Devoirs ──────────────────────────────────────────────────────────────

    /**
     * Devoirs liés aux classes/matières de l'enseignant.
     * GET /api/enseignant/devoirs?periode_id=
     */
    public function devoirs(Request $request)
    {
        $enseignant = $request->user();

        // Classes et matières de cet enseignant
        $cem = DB::table('classe_enseignant_matiere')
            ->where('enseignant_id', $enseignant->id)
            ->get();

        $classeIds  = $cem->pluck('classe_id')->unique()->values();
        $matiereIds = $cem->pluck('matiere_id')->unique()->values();

        $query = Devoir::with(['typeDevoir', 'matiere', 'classe', 'niveau', 'periode'])
            ->whereIn('matiere_id', $matiereIds)
            ->where(function ($q) use ($classeIds) {
                $q->whereIn('classe_id', $classeIds)
                  ->orWhereNotNull('niveau_id');
            });

        if ($request->has('periode_id')) {
            $query->where('periode_id', $request->periode_id);
        }

        $devoirs = $query->orderBy('date_devoir', 'desc')->get();

        return response()->json($devoirs);
    }

    /**
     * Créer un devoir.
     * POST /api/enseignant/devoirs
     */
    public function creerDevoir(Request $request)
    {
        $request->validate([
            'code_devoir'    => 'required|string|max:100',
            'date_devoir'    => 'required|date',
            'coeff_devoir'   => 'required|numeric|min:0',
            'type_devoir_id' => 'required|exists:type_devoirs,id',
            'matiere_id'     => 'required|exists:matieres,id',
            'periode_id'     => 'nullable|exists:periodes,id',
            'classe_id'      => 'nullable|exists:classes,id',
            'niveau_id'      => 'nullable|exists:niveaux,id',
        ]);

        $devoir = Devoir::create([
            'code_devoir'    => $request->code_devoir,
            'date_devoir'    => $request->date_devoir,
            'coeff_devoir'   => $request->coeff_devoir,
            'type_devoir_id' => $request->type_devoir_id,
            'matiere_id'     => $request->matiere_id,
            'periode_id'     => $request->periode_id,
            'classe_id'      => $request->classe_id ?: null,
            'niveau_id'      => $request->niveau_id ?: null,
        ]);

        return response()->json($devoir->load(['typeDevoir', 'matiere', 'classe', 'niveau', 'periode']), 201);
    }

    /**
     * Modifier un devoir.
     * PUT /api/enseignant/devoirs/{id}
     */
    public function modifierDevoir(Request $request, int $id)
    {
        $devoir = Devoir::findOrFail($id);

        $request->validate([
            'code_devoir'    => 'required|string|max:100',
            'date_devoir'    => 'required|date',
            'coeff_devoir'   => 'required|numeric|min:0',
            'type_devoir_id' => 'required|exists:type_devoirs,id',
            'matiere_id'     => 'required|exists:matieres,id',
            'periode_id'     => 'nullable|exists:periodes,id',
            'classe_id'      => 'nullable|exists:classes,id',
            'niveau_id'      => 'nullable|exists:niveaux,id',
        ]);

        $devoir->update([
            'code_devoir'    => $request->code_devoir,
            'date_devoir'    => $request->date_devoir,
            'coeff_devoir'   => $request->coeff_devoir,
            'type_devoir_id' => $request->type_devoir_id,
            'matiere_id'     => $request->matiere_id,
            'periode_id'     => $request->periode_id,
            'classe_id'      => $request->classe_id ?: null,
            'niveau_id'      => $request->niveau_id ?: null,
        ]);

        return response()->json($devoir->load(['typeDevoir', 'matiere', 'classe', 'niveau', 'periode']));
    }

    // ── Notes ────────────────────────────────────────────────────────────────

    /**
     * Notes d'un devoir avec liste des élèves.
     * GET /api/enseignant/devoir/{id}/notes?classe_id=
     */
    public function notes(Request $request, int $devoirId)
    {
        $devoir = Devoir::with(['classe', 'niveau', 'matiere', 'typeDevoir', 'periode'])->findOrFail($devoirId);

        if ($devoir->niveau_id && !$devoir->classe_id) {
            $classeId = $request->query('classe_id');
            if (!$classeId) {
                $classes = Classe::where('niveau_id', $devoir->niveau_id)->orderBy('nom_classe')->get();
                return response()->json(['devoir' => $devoir, 'notes' => [], 'classes_niveau' => $classes]);
            }
            $eleves = Eleve::where('classe_id', $classeId)->orderBy('nom_eleve')->get();
        } else {
            $eleves = Eleve::where('classe_id', $devoir->classe_id)->orderBy('nom_eleve')->get();
        }

        $notes = Note::where('devoir_id', $devoirId)->get()->keyBy('eleve_id');

        $data = $eleves->map(fn ($e) => [
            'eleve_id'        => $e->id,
            'nom_eleve'       => $e->nom_eleve,
            'prenoms_eleve'   => $e->prenoms_eleve,
            'matricule_eleve' => $e->matricule_eleve,
            'note_id'         => $notes->get($e->id)?->id,
            'note'            => $notes->get($e->id)?->note,
        ]);

        return response()->json(['devoir' => $devoir, 'notes' => $data, 'classes_niveau' => []]);
    }

    /**
     * Sauvegarder les notes d'un devoir.
     * POST /api/enseignant/devoir/{id}/notes
     */
    public function sauvegarderNotes(Request $request, int $devoirId)
    {
        Devoir::findOrFail($devoirId);

        $request->validate([
            'notes'            => 'required|array',
            'notes.*.eleve_id' => 'required|exists:eleves,id',
            'notes.*.note'     => 'nullable|numeric|min:0|max:20',
        ]);

        foreach ($request->notes as $item) {
            if ($item['note'] === null || $item['note'] === '') {
                Note::where('devoir_id', $devoirId)->where('eleve_id', $item['eleve_id'])->delete();
            } else {
                Note::updateOrCreate(
                    ['devoir_id' => $devoirId, 'eleve_id' => $item['eleve_id']],
                    ['note' => $item['note']]
                );
            }
        }

        return response()->json(['message' => 'Notes enregistrées avec succès.']);
    }

    // ── Assiduité ────────────────────────────────────────────────────────────

    /**
     * Feuille de présence d'une classe.
     * GET /api/enseignant/assiduites?classe_id=&matiere_id=&periode_id=&date=
     */
    public function feuillePresence(Request $request)
    {
        $request->validate([
            'classe_id'  => 'required|exists:classes,id',
            'matiere_id' => 'required|exists:matieres,id',
            'periode_id' => 'required|exists:periodes,id',
            'date'       => 'required|date',
        ]);

        $eleves = Eleve::where('classe_id', $request->classe_id)
            ->orderBy('nom_eleve')
            ->get();

        $assiduites = Assiduites::where('matiere_id', $request->matiere_id)
            ->where('periode_id', $request->periode_id)
            ->where('date_assiduite', $request->date)
            ->whereIn('eleve_id', $eleves->pluck('id'))
            ->get()
            ->keyBy('eleve_id');

        $data = $eleves->map(fn ($e) => [
            'eleve_id'    => $e->id,
            'nom'         => $e->nom_eleve,
            'prenoms'     => $e->prenoms_eleve,
            'matricule'   => $e->matricule_eleve,
            'photo_url'   => $e->photo_url,
            'statut'      => $assiduites->get($e->id)?->statut ?? 'present',
            'remarque'    => $assiduites->get($e->id)?->remarque ?? '',
        ]);

        return response()->json($data);
    }

    /**
     * Sauvegarder la feuille de présence.
     * POST /api/enseignant/assiduites
     */
    public function sauvegarderPresences(Request $request)
    {
        $request->validate([
            'classe_id'          => 'required|exists:classes,id',
            'matiere_id'         => 'required|exists:matieres,id',
            'periode_id'         => 'required|exists:periodes,id',
            'date'               => 'required|date',
            'assiduites'         => 'required|array',
            'assiduites.*.eleve_id' => 'required|exists:eleves,id',
            'assiduites.*.statut'   => 'required|in:present,absent,retard',
            'assiduites.*.remarque' => 'nullable|string|max:255',
        ]);

        $notifService = app(NotificationService::class);

        // Pré-charger tous les élèves concernés pour éviter le N+1
        $eleveIds = collect($request->assiduites)->pluck('eleve_id')->unique();
        $elevesMap = Eleve::with('parents')->whereIn('id', $eleveIds)->get()->keyBy('id');

        // Pré-charger les assiduités existantes pour cette session
        $existantes = Assiduites::where([
            'matiere_id'     => $request->matiere_id,
            'periode_id'     => $request->periode_id,
            'date_assiduite' => $request->date,
        ])->whereIn('eleve_id', $eleveIds)->get()->keyBy('eleve_id');

        foreach ($request->assiduites as $item) {
            $statutPrecedent = $existantes[$item['eleve_id']]?->statut ?? null;

            Assiduites::updateOrCreate(
                [
                    'eleve_id'       => $item['eleve_id'],
                    'matiere_id'     => $request->matiere_id,
                    'periode_id'     => $request->periode_id,
                    'date_assiduite' => $request->date,
                ],
                [
                    'statut'   => $item['statut'],
                    'remarque' => $item['remarque'] ?? null,
                ]
            );

            if (in_array($item['statut'], ['absent', 'retard']) && $statutPrecedent !== $item['statut']) {
                $eleve = $elevesMap[$item['eleve_id']] ?? null;
                if ($eleve?->parents) {
                    $label = $item['statut'] === 'absent' ? 'absent(e)' : 'en retard';
                    $notifService->notifierParent(
                        $eleve->parents->id,
                        'absence',
                        'Absence signalée',
                        "{$eleve->prenoms_eleve} {$eleve->nom_eleve} a été signalé(e) {$label} le {$request->date}.",
                        ['eleve_id' => $eleve->id, 'date' => $request->date]
                    );
                }
            }
        }

        return response()->json(['message' => 'Présences enregistrées avec succès.']);
    }

    // ── Emploi du temps & Infos ──────────────────────────────────────────────

    /**
     * Emploi du temps de l'enseignant.
     * GET /api/enseignant/emploi
     */
    public function emploiDuTemps(Request $request)
    {
        $enseignant = $request->user();
        $jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

        $creneaux = EmploiDuTemps::with(['matiere', 'classe'])
            ->where('enseignant_id', $enseignant->id)
            ->get()
            ->groupBy('jour')
            ->sortKeysUsing(fn ($a, $b) =>
                array_search($a, $jours) <=> array_search($b, $jours)
            );

        return response()->json($creneaux);
    }

    /**
     * Périodes actives.
     * GET /api/enseignant/periodes
     */
    public function periodes()
    {
        return response()->json(Periodes::orderBy('date_debut')->get());
    }

    /**
     * Types de devoirs.
     * GET /api/enseignant/typeDevoirs
     */
    public function typeDevoirs()
    {
        return response()->json(\App\Models\TypeDevoir::all());
    }

    /**
     * Informations de l'établissement.
     * GET /api/enseignant/informations
     */
    public function informations()
    {
        return response()->json(Informations::orderBy('date_info', 'desc')->take(30)->get());
    }

    // ── Progression du programme ─────────────────────────────────────────────

    /**
     * Chapitres d'une matière avec les progressions du prof pour une classe/période.
     * GET /api/enseignant/progression?classe_id=&matiere_id=&periode_id=
     */
    public function progression(Request $request)
    {
        $request->validate([
            'classe_id'  => 'required|exists:classes,id',
            'matiere_id' => 'required|exists:matieres,id',
            'periode_id' => 'required|exists:periodes,id',
        ]);

        $enseignant = $request->user();
        $this->verifierAccesClasse($enseignant->id, $request->classe_id);

        $chapitres = ChapitreMatiere::where('matiere_id', $request->matiere_id)
            ->orderBy('ordre')
            ->get();

        $progressions = Progression::where('classe_id',    $request->classe_id)
            ->where('enseignant_id', $enseignant->id)
            ->where('periode_id',   $request->periode_id)
            ->whereIn('chapitre_id', $chapitres->pluck('id'))
            ->get()
            ->keyBy('chapitre_id');

        $data = $chapitres->map(fn ($ch) => [
            'chapitre_id'    => $ch->id,
            'titre'          => $ch->titre,
            'ordre'          => $ch->ordre,
            'note_direction' => $ch->note_direction,
            'progression'    => $progressions->has($ch->id) ? [
                'id'           => $progressions[$ch->id]->id,
                'statut'       => $progressions[$ch->id]->statut,
                'date_seance'  => $progressions[$ch->id]->date_seance,
                'observations' => $progressions[$ch->id]->observations,
            ] : null,
        ]);

        return response()->json($data);
    }

    /**
     * Enregistrer ou mettre à jour la progression sur un chapitre.
     * POST /api/enseignant/progression
     */
    public function sauvegarderProgression(Request $request)
    {
        $request->validate([
            'chapitre_id' => 'required|exists:chapitres_matiere,id',
            'classe_id'   => 'required|exists:classes,id',
            'periode_id'  => 'required|exists:periodes,id',
            'date_seance' => 'required|date',
            'statut'      => 'required|in:fait,en_cours,reporte',
            'observations'=> [
                'nullable', 'string', 'max:1000',
                function ($attr, $val, $fail) use ($request) {
                    if (in_array($request->statut, ['en_cours', 'reporte']) && empty(trim($val ?? ''))) {
                        $fail('Les observations sont obligatoires pour ce statut.');
                    }
                },
            ],
        ]);

        $enseignant = $request->user();
        $this->verifierAccesClasse($enseignant->id, $request->classe_id);

        $progression = Progression::updateOrCreate(
            [
                'chapitre_id'   => $request->chapitre_id,
                'classe_id'     => $request->classe_id,
                'enseignant_id' => $enseignant->id,
                'periode_id'    => $request->periode_id,
            ],
            [
                'date_seance'  => $request->date_seance,
                'statut'       => $request->statut,
                'observations' => $request->observations,
            ]
        );

        return response()->json($progression, 201);
    }

    /**
     * Supprimer une progression (remettre un chapitre à "non abordé").
     * DELETE /api/enseignant/progression/{id}
     */
    public function supprimerProgression(Request $request, int $id)
    {
        $progression = Progression::findOrFail($id);

        if ($progression->enseignant_id !== $request->user()->id) {
            abort(403, 'Action non autorisée.');
        }

        $progression->delete();
        return response()->json(null, 204);
    }

    // ── Utilitaires ──────────────────────────────────────────────────────────

    private function verifierAccesClasse(int $enseignantId, int $classeId): void
    {
        $acces = DB::table('classe_enseignant_matiere')
            ->where('enseignant_id', $enseignantId)
            ->where('classe_id', $classeId)
            ->exists();

        if (!$acces) {
            abort(403, 'Accès non autorisé à cette classe.');
        }
    }
}
