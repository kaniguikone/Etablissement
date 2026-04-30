<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Assiduites;
use App\Models\Etablissement;
use App\Models\Note;
use App\Models\Periodes;
use App\Models\Paiement;
use App\Models\Scolarites;
use App\Models\Informations;
use App\Models\EmploiDuTemps;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Http\Controllers\API\BulletinPdfController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ParentPortalController extends Controller
{
    /**
     * Liste des enfants du parent connecté.
     * GET /api/parent/enfants
     */
    public function enfants(Request $request)
    {
        $parent = $request->user();

        $eleves = Eleve::with(['classe.niveau'])
            ->where('parent_id', $parent->id)
            ->get()
            ->map(fn ($e) => [
                'id'             => $e->id,
                'matricule'      => $e->matricule_eleve,
                'nom'            => $e->nom_eleve,
                'prenoms'        => $e->prenoms_eleve,
                'date_naissance' => $e->date_naissance_eleve,
                'classe_id'      => $e->classe_id,
                'classe'         => $e->classe->nom_classe ?? null,
                'niveau'         => $e->classe->niveau->libelle_niveau ?? null,
                'photo_url'      => $e->photo_url,
            ]);

        return response()->json($eleves);
    }

    /**
     * Bulletin de notes d'un enfant pour une période.
     * GET /api/parent/enfant/{id}/bulletin/{periodeId}
     */
    public function bulletin(Request $request, int $eleveId, int $periodeId)
    {
        $parent = $request->user();
        $eleve  = Eleve::where('id', $eleveId)
            ->where('parent_id', $parent->id)
            ->firstOrFail();

        $notes = Note::with(['devoir.matiere', 'devoir.typeDevoir'])
            ->where('eleve_id', $eleveId)
            ->whereHas('devoir', fn ($q) => $q->where('periode_id', $periodeId))
            ->get();

        $grouped = $notes->groupBy(fn ($n) => $n->devoir->matiere_id);

        $matieres = $grouped->map(function ($notesMatiere) {
            $totalCoeff  = $notesMatiere->sum(fn ($n) => $n->devoir->coeff_devoir);
            $weightedSum = $notesMatiere->sum(fn ($n) => $n->note * $n->devoir->coeff_devoir);
            $moyenne     = $totalCoeff > 0 ? round($weightedSum / $totalCoeff, 2) : null;
            $first       = $notesMatiere->first();

            return [
                'matiere_id' => $first->devoir->matiere_id,
                'matiere'    => $first->devoir->matiere->libelle_matiere ?? null,
                'abbr'       => $first->devoir->matiere->abbr_matiere ?? null,
                'moyenne'    => $moyenne,
                'notes'      => $notesMatiere->map(fn ($n) => [
                    'type'  => $n->devoir->typeDevoir->code_type_devoir ?? null,
                    'date'  => $n->devoir->date_devoir,
                    'note'  => $n->note,
                    'coeff' => $n->devoir->coeff_devoir,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'eleve'    => [
                'id'      => $eleve->id,
                'nom'     => $eleve->nom_eleve,
                'prenoms' => $eleve->prenoms_eleve,
            ],
            'matieres' => $matieres,
        ]);
    }

    /**
     * Bulletin PDF d'un enfant pour une période (portail parent).
     * GET /api/parent/enfant/{id}/bulletin/{periodeId}/pdf
     */
    public function bulletinPdf(Request $request, int $eleveId, int $periodeId)
    {
        // Vérifier que l'enfant appartient bien à ce parent
        $parent = $request->user();
        Eleve::where('id', $eleveId)->where('parent_id', $parent->id)->firstOrFail();

        // Déléguer la génération PDF au contrôleur dédié (vue unifiée)
        return app(BulletinPdfController::class)->telecharger((string) $eleveId, (string) $periodeId);
    }

    /**
     * Absences et retards d'un enfant pour une période.
     * GET /api/parent/enfant/{id}/assiduites/{periodeId}
     */
    public function assiduites(Request $request, int $eleveId, int $periodeId)
    {
        $parent = $request->user();
        Eleve::where('id', $eleveId)->where('parent_id', $parent->id)->firstOrFail();

        $records = Assiduites::with('matiere')
            ->where('eleve_id', $eleveId)
            ->where('periode_id', $periodeId)
            ->whereIn('statut', ['absent', 'retard'])
            ->orderBy('date_assiduite', 'desc')
            ->get()
            ->map(fn ($a) => [
                'id'       => $a->id,
                'date'     => $a->date_assiduite,
                'statut'   => $a->statut,
                'matiere'  => $a->matiere->libelle_matiere ?? null,
                'remarque' => $a->remarque,
            ]);

        return response()->json($records);
    }

    /**
     * Échéances de scolarité pour le niveau de l'enfant.
     * GET /api/parent/enfant/{id}/scolarites
     */
    public function scolarites(Request $request, int $eleveId)
    {
        $parent = $request->user();
        $eleve  = Eleve::with('classe.niveau')
            ->where('id', $eleveId)
            ->where('parent_id', $parent->id)
            ->firstOrFail();

        $niveauId  = $eleve->classe?->niveau_id;
        $echeances = $niveauId
            ? Scolarites::where('niveau_id', $niveauId)->orderBy('date_echeance')->get()
            : collect();

        return response()->json([
            'niveau'    => $eleve->classe?->niveau?->libelle_niveau ?? null,
            'echeances' => $echeances,
        ]);
    }

    /**
     * Liste des enseignants de la classe de l'enfant.
     * GET /api/parent/enfant/{id}/enseignants
     */
    public function enseignants(Request $request, int $eleveId)
    {
        $parent = $request->user();
        $eleve  = Eleve::where('id', $eleveId)->where('parent_id', $parent->id)->firstOrFail();

        $enseignants = DB::table('classe_enseignant_matiere as cem')
            ->join('enseignants as e', 'e.id', '=', 'cem.enseignant_id')
            ->join('matieres as m', 'm.id', '=', 'cem.matiere_id')
            ->where('cem.classe_id', $eleve->classe_id)
            ->select(
                'e.id',
                'e.matricule_enseignant',
                'e.nom_enseignant',
                'e.prenoms_enseignant',
                'm.libelle_matiere',
                'm.abbr_matiere'
            )
            ->get();

        return response()->json($enseignants);
    }

    /**
     * Informations générales de l'établissement.
     * GET /api/parent/informations
     */
    public function informations()
    {
        $informations = Informations::orderBy('date_info', 'desc')->take(30)->get();

        return response()->json($informations);
    }

    public function emploiDuTemps(Request $request, int $eleveId)
    {
        $parent = $request->user();
        $eleve  = Eleve::where('id', $eleveId)
            ->where('parent_id', $parent->id)
            ->firstOrFail();

        $jours    = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        $creneaux = EmploiDuTemps::with(['matiere', 'enseignant'])
            ->where('classe_id', $eleve->classe_id)
            ->get()
            ->groupBy('jour')
            ->sortKeysUsing(fn ($a, $b) =>
                array_search($a, $jours) <=> array_search($b, $jours)
            );

        return response()->json($creneaux);
    }

    /**
     * Paiements effectués pour un enfant du parent connecté.
     * GET /api/parent/enfant/{id}/paiements
     */
    public function paiements(Request $request, int $eleveId)
    {
        $parent = $request->user();
        $eleve  = Eleve::where('id', $eleveId)
                       ->where('parent_id', $parent->id)
                       ->firstOrFail();

        $paiements = Paiement::with('scolarite')
            ->where('eleve_id', $eleve->id)
            ->where(function ($q) {
                $q->whereNull('statut_cinetpay')
                  ->orWhere('statut_cinetpay', 'paid');
            })
            ->whereNotNull('date_paiement')
            ->orderBy('date_paiement', 'desc')
            ->get();

        return response()->json($paiements);
    }

    /**
     * Reçu PDF d'un paiement (vérifie l'appartenance au parent connecté).
     * GET /api/parent/paiements/{id}/recu
     */
    public function recuPdf(Request $request, int $paiementId)
    {
        $parent   = $request->user();
        $paiement = Paiement::with(['eleve.classe.niveau', 'scolarite'])
            ->where('id', $paiementId)
            ->whereHas('eleve', fn($q) => $q->where('parent_id', $parent->id))
            ->firstOrFail();

        $etablissement = Etablissement::first();

        $pdf = Pdf::loadView('paiements.recu', compact('paiement', 'etablissement'))
                   ->setPaper('A5', 'portrait');

        $nomFichier = sprintf(
            'recu_%s_%s_%s.pdf',
            str_pad($paiement->id, 6, '0', STR_PAD_LEFT),
            strtolower($paiement->eleve->nom_eleve),
            $paiement->date_paiement->format('Y-m-d')
        );

        return $pdf->download($nomFichier);
    }
}
