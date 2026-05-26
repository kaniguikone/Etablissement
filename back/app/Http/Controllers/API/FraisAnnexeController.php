<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\FraisAnnexe;
use App\Models\Niveau;
use App\Models\PaiementFraisAnnexe;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FraisAnnexeController extends Controller
{
    // ── Configuration des frais ───────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = FraisAnnexe::with('niveau')->orderBy('annee', 'desc')->orderBy('nom');

        if ($request->filled('annee'))     $query->where('annee', $request->annee);
        if ($request->filled('niveau_id')) $query->where('niveau_id', $request->niveau_id);
        if ($request->filled('categorie')) $query->where('categorie', $request->categorie);

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nom'        => 'required|string|max:150',
            'categorie'  => 'required|in:' . implode(',', array_keys(FraisAnnexe::CATEGORIES)),
            'montant'    => 'required|numeric|min:1',
            'annee'      => 'required|string|max:12',
            'niveau_id'  => 'nullable|exists:niveaux,id',
            'obligatoire'=> 'boolean',
            'description'=> 'nullable|string|max:255',
        ]);

        $frais = FraisAnnexe::create($request->only(
            ['nom', 'categorie', 'montant', 'annee', 'niveau_id', 'obligatoire', 'description']
        ));

        return response()->json($frais->load('niveau'), 201);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'nom'        => 'required|string|max:150',
            'categorie'  => 'required|in:' . implode(',', array_keys(FraisAnnexe::CATEGORIES)),
            'montant'    => 'required|numeric|min:1',
            'annee'      => 'required|string|max:12',
            'niveau_id'  => 'nullable|exists:niveaux,id',
            'obligatoire'=> 'boolean',
            'description'=> 'nullable|string|max:255',
        ]);

        $frais = FraisAnnexe::findOrFail($id);
        $frais->update($request->only(
            ['nom', 'categorie', 'montant', 'annee', 'niveau_id', 'obligatoire', 'description']
        ));

        return response()->json($frais->load('niveau'));
    }

    public function destroy(string $id)
    {
        FraisAnnexe::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // ── Paiements par élève ───────────────────────────────────────────────────

    /**
     * Retourne tous les frais (dus + payés) pour un élève donné.
     * GET /api/frais-annexes/eleve/{eleveId}?annee=2025-2026
     */
    public function parEleve(string $eleveId, Request $request)
    {
        $eleve  = Eleve::with('classe.niveau')->findOrFail($eleveId);
        $annee  = $request->input('annee');
        $niveauId = $eleve->classe?->niveau_id;

        // Frais applicables à cet élève (son niveau ou tous niveaux)
        $query = FraisAnnexe::when($annee, fn($q) => $q->where('annee', $annee))
            ->where(fn($q) => $q->whereNull('niveau_id')->orWhere('niveau_id', $niveauId));

        $frais = $query->get();

        // Paiements effectués par cet élève
        $paiements = PaiementFraisAnnexe::with('fraisAnnexe')
            ->where('eleve_id', $eleveId)
            ->when($annee, fn($q) => $q->whereHas('fraisAnnexe', fn($q2) => $q2->where('annee', $annee)))
            ->orderBy('date_paiement', 'desc')
            ->get();

        $totalDu   = $frais->where('obligatoire', true)->sum('montant');
        $totalPaye = $paiements->sum('montant_paye');

        $recap = $frais->map(function ($f) use ($paiements) {
            $payePourCeFrais = $paiements->where('frais_annexe_id', $f->id)->sum('montant_paye');
            return [
                'frais_id'    => $f->id,
                'nom'         => $f->nom,
                'categorie'   => $f->categorie,
                'montant_du'  => $f->montant,
                'obligatoire' => $f->obligatoire,
                'montant_paye'=> (float) $payePourCeFrais,
                'solde'       => $f->obligatoire ? (float) $f->montant - (float) $payePourCeFrais : 0.0,
                'statut'      => (float) $payePourCeFrais >= (float) $f->montant ? 'soldé' : ($payePourCeFrais > 0 ? 'partiel' : 'impayé'),
            ];
        });

        return response()->json([
            'eleve'       => $eleve,
            'recap'       => $recap,
            'paiements'   => $paiements,
            'total_du'    => (float) $totalDu,
            'total_paye'  => (float) $totalPaye,
            'solde'       => (float) $totalDu - (float) $totalPaye,
        ]);
    }

    /**
     * Enregistre un paiement de frais annexe.
     * POST /api/paiements-frais-annexes
     */
    public function enregistrerPaiement(Request $request)
    {
        $request->validate([
            'eleve_id'           => 'required|exists:eleves,id',
            'frais_annexe_id'    => 'required|exists:frais_annexes,id',
            'montant_paye'       => 'required|numeric|min:1',
            'date_paiement'      => 'required|date',
            'mode_paiement'      => 'required|in:especes,cheque,virement,autre',
            'reference_paiement' => 'nullable|string|max:100',
            'remarque'           => 'nullable|string|max:255',
        ]);

        $paiement = PaiementFraisAnnexe::create($request->only([
            'eleve_id', 'frais_annexe_id', 'montant_paye', 'date_paiement',
            'mode_paiement', 'reference_paiement', 'remarque',
        ]));

        return response()->json($paiement->load(['eleve', 'fraisAnnexe']), 201);
    }

    /**
     * Supprime un paiement de frais annexe.
     * DELETE /api/paiements-frais-annexes/{id}
     */
    public function supprimerPaiement(string $id)
    {
        PaiementFraisAnnexe::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // ── Impayés ───────────────────────────────────────────────────────────────

    /**
     * Tableau des impayés de frais annexes obligatoires.
     * GET /api/frais-annexes/impayes?annee=2025-2026&niveau_id=X&frais_annexe_id=Y
     */
    public function impayes(Request $request)
    {
        $annee         = $request->input('annee');
        $niveauId      = $request->input('niveau_id');
        $fraisAnnexeId = $request->input('frais_annexe_id');

        // Frais obligatoires concernés
        $fraisQuery = FraisAnnexe::where('obligatoire', true)
            ->when($annee,         fn($q) => $q->where('annee', $annee))
            ->when($niveauId,      fn($q) => $q->where(fn($q2) => $q2->whereNull('niveau_id')->orWhere('niveau_id', $niveauId)))
            ->when($fraisAnnexeId, fn($q) => $q->where('id', $fraisAnnexeId));

        $fraisList = $fraisQuery->get();

        $lignes = [];

        foreach ($fraisList as $frais) {
            // Élèves concernés par ce frais
            $eleveQuery = Eleve::with(['classe.niveau']);
            if ($frais->niveau_id) {
                $eleveQuery->whereHas('classe', fn($q) => $q->where('niveau_id', $frais->niveau_id));
            }
            if ($niveauId && !$frais->niveau_id) {
                $eleveQuery->whereHas('classe', fn($q) => $q->where('niveau_id', $niveauId));
            }

            $eleves = $eleveQuery->get();

            // Paiements existants pour ce frais
            $payes = PaiementFraisAnnexe::where('frais_annexe_id', $frais->id)
                ->whereIn('eleve_id', $eleves->pluck('id'))
                ->select('eleve_id', DB::raw('SUM(montant_paye) as total_paye'))
                ->groupBy('eleve_id')
                ->pluck('total_paye', 'eleve_id');

            foreach ($eleves as $eleve) {
                $totalPaye = (float) ($payes[$eleve->id] ?? 0);
                $solde     = (float) $frais->montant - $totalPaye;

                if ($solde <= 0) continue; // Soldé

                $lignes[] = [
                    'eleve_id'    => $eleve->id,
                    'matricule'   => $eleve->matricule_eleve,
                    'nom'         => $eleve->nom_eleve . ' ' . $eleve->prenoms_eleve,
                    'classe'      => $eleve->classe?->abbr_classe,
                    'niveau'      => $eleve->classe?->niveau?->nom_niveau,
                    'frais_id'    => $frais->id,
                    'frais_nom'   => $frais->nom,
                    'categorie'   => $frais->categorie,
                    'montant_du'  => (float) $frais->montant,
                    'total_paye'  => $totalPaye,
                    'solde'       => $solde,
                    'statut'      => $totalPaye > 0 ? 'partiel' : 'impayé',
                ];
            }
        }

        $totalImpayes = collect($lignes)->sum('solde');

        return response()->json([
            'data'          => $lignes,
            'count'         => count($lignes),
            'total_impayes' => $totalImpayes,
        ]);
    }

    // ── Reçu PDF ─────────────────────────────────────────────────────────────

    public function recu(string $id)
    {
        $paiement      = PaiementFraisAnnexe::with(['eleve.classe.niveau', 'fraisAnnexe.niveau'])->findOrFail($id);
        $etablissement = Etablissement::first();

        $pdf = Pdf::loadView('paiements.recu_frais_annexe', compact('paiement', 'etablissement'))
            ->setPaper('A5', 'portrait');

        $nomFichier = sprintf(
            'recu_frais_%s_%s_%s.pdf',
            str_pad($paiement->id, 6, '0', STR_PAD_LEFT),
            strtolower($paiement->eleve->nom_eleve ?? 'eleve'),
            $paiement->date_paiement
        );

        return $pdf->download($nomFichier);
    }
}
