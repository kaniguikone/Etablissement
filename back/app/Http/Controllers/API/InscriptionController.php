<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DemandeInscription;
use App\Models\Eleve;
use App\Models\Niveau;
use App\Models\Parents;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class InscriptionController extends Controller
{
    // ── Routes PUBLIQUES (sans auth) ─────────────────────────────────────────

    /**
     * Soumettre une demande d'inscription (flux parent depuis mobile).
     * POST /api/inscription
     */
    public function soumettre(Request $request)
    {
        $request->validate([
            'nom_eleve'            => 'required|string|max:100',
            'prenoms_eleve'        => 'required|string|max:150',
            'date_naissance_eleve' => 'required|string',
            'genre_eleve'          => 'required|in:M,F',
            'lieu_naissance_eleve' => 'nullable|string|max:100',
            'nationalite_eleve'    => 'nullable|string|max:80',
            'adresse_eleve'        => 'nullable|string|max:200',
            'niveau_id'            => 'nullable|exists:niveaux,id',
            'niveau_souhaite'      => 'nullable|string|max:100',
            'nom_parent'           => 'required|string|max:100',
            'prenom_parent'        => 'required|string|max:150',
            'numero_parent'        => 'required|string|max:20',
            'email_parent'         => 'nullable|email|max:150',
            'relation_parent'      => 'nullable|string|max:50',
            'profession_parent'    => 'nullable|string|max:100',
            'adresse_parent'       => 'nullable|string|max:200',
        ]);

        $demande = new DemandeInscription($request->only([
            'nom_eleve', 'prenoms_eleve', 'date_naissance_eleve', 'genre_eleve',
            'lieu_naissance_eleve', 'nationalite_eleve', 'adresse_eleve',
            'niveau_id', 'niveau_souhaite',
            'nom_parent', 'prenom_parent', 'numero_parent',
            'email_parent', 'relation_parent', 'profession_parent', 'adresse_parent',
        ]));
        $demande->origine = 'parent';
        $demande->statut  = 'en_attente';
        $demande->token   = Str::random(40);
        $demande->save();

        return response()->json([
            'message' => 'Demande soumise avec succès. Conservez votre token de suivi.',
            'token'   => $demande->token,
        ], 201);
    }

    /**
     * Suivi d'une demande par token (flux parent).
     * GET /api/inscription/{token}/statut
     */
    public function statut(string $token)
    {
        $demande = DemandeInscription::where('token', $token)
            ->with('niveau')
            ->firstOrFail();

        return response()->json([
            'statut'       => $demande->statut,
            'motif_rejet'  => $demande->motif_rejet,
            'nom_eleve'    => $demande->nom_eleve,
            'prenoms_eleve'=> $demande->prenoms_eleve,
            'niveau'       => $demande->niveau?->nom_niveau ?? $demande->niveau_souhaite,
            'created_at'   => $demande->created_at,
        ]);
    }

    // ── Routes ADMIN (avec auth) ──────────────────────────────────────────────

    /**
     * Liste des demandes (admin).
     * GET /api/inscriptions
     */
    public function index(Request $request)
    {
        $query = DemandeInscription::with('niveau', 'eleve')
            ->orderBy('created_at', 'desc');

        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->has('origine')) {
            $query->where('origine', $request->origine);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Détail d'une demande.
     * GET /api/inscriptions/{id}
     */
    public function show(int $id)
    {
        return response()->json(
            DemandeInscription::with('niveau', 'eleve')->findOrFail($id)
        );
    }

    /**
     * Valider une demande → crée parent + élève automatiquement.
     * POST /api/inscriptions/{id}/valider
     */
    public function valider(Request $request, int $id)
    {
        $request->validate([
            'classe_id' => 'required|exists:classes,id',
        ]);

        $demande = DemandeInscription::where('statut', 'en_attente')->findOrFail($id);

        // Créer ou retrouver le parent
        $parent = Parents::where('numero_parent', $demande->numero_parent)->first();
        if (!$parent) {
            $relationsValides = ['Père', 'Mère', 'Tuteur', 'Autre'];
            $relation = in_array($demande->relation_parent, $relationsValides)
                ? $demande->relation_parent
                : 'Autre';

            $parent = Parents::create([
                'nom_parent'        => $demande->nom_parent,
                'prenom_parent'     => $demande->prenom_parent,
                'numero_parent'     => $demande->numero_parent,
                'email_parent'      => $demande->email_parent,
                'relation_parent'   => $relation,
                'profession_parent' => $demande->profession_parent,
                'adresse_parent'    => $demande->adresse_parent,
                'password'          => Hash::make(Str::random(8)),
            ]);
        }

        // Créer l'élève
        $eleve = Eleve::create([
            'matricule_eleve'      => $this->genererMatricule(),
            'nom_eleve'            => $demande->nom_eleve,
            'prenoms_eleve'        => $demande->prenoms_eleve,
            'date_naissance_eleve' => $demande->date_naissance_eleve,
            'genre_eleve'          => $demande->genre_eleve,
            'lieu_naissance_eleve' => $demande->lieu_naissance_eleve,
            'nationalite_eleve'    => $demande->nationalite_eleve ?? 'Ivoirienne',
            'adresse_eleve'        => $demande->adresse_eleve,
            'classe_id'            => $request->classe_id,
            'parent_id'            => $parent->id,
        ]);

        $demande->update([
            'statut'   => 'validee',
            'eleve_id' => $eleve->id,
        ]);

        // Notification au parent
        app(NotificationService::class)->notifierParent(
            $parent->id,
            'inscription',
            'Inscription validée',
            "L'inscription de {$eleve->prenoms_eleve} {$eleve->nom_eleve} a été validée.",
            ['eleve_id' => $eleve->id]
        );

        return response()->json([
            'message' => 'Inscription validée. Élève créé avec succès.',
            'eleve'   => $eleve->load('classe'),
            'parent'  => $parent,
        ]);
    }

    /**
     * Rejeter une demande.
     * POST /api/inscriptions/{id}/rejeter
     */
    public function rejeter(Request $request, int $id)
    {
        $request->validate([
            'motif_rejet' => 'nullable|string|max:255',
        ]);

        $demande = DemandeInscription::where('statut', 'en_attente')->findOrFail($id);
        $demande->update([
            'statut'      => 'rejetee',
            'motif_rejet' => $request->motif_rejet,
        ]);

        // Notification au parent si un compte parent existe avec ce numéro
        $parent = Parents::where('numero_parent', $demande->numero_parent)->first();
        if ($parent) {
            $motif = $request->motif_rejet ? " Motif : {$request->motif_rejet}" : '';
            app(NotificationService::class)->notifierParent(
                $parent->id,
                'inscription',
                'Demande d\'inscription rejetée',
                "La demande d'inscription de {$demande->prenoms_eleve} {$demande->nom_eleve} a été rejetée.{$motif}"
            );
        }

        return response()->json(['message' => 'Demande rejetée.']);
    }

    /**
     * Inscription directe par l'établissement (sans validation).
     * POST /api/inscriptions/directe
     */
    public function directe(Request $request)
    {
        $request->validate([
            'nom_eleve'            => 'required|string|max:100',
            'prenoms_eleve'        => 'required|string|max:150',
            'date_naissance_eleve' => 'required|string',
            'genre_eleve'          => 'required|in:M,F',
            'lieu_naissance_eleve' => 'nullable|string|max:100',
            'nationalite_eleve'    => 'nullable|string|max:80',
            'adresse_eleve'        => 'nullable|string|max:200',
            'classe_id'            => 'required|exists:classes,id',
            'nom_parent'           => 'required|string|max:100',
            'prenom_parent'        => 'required|string|max:150',
            'numero_parent'        => 'required|string|max:20',
            'email_parent'         => 'nullable|email|max:150',
            'relation_parent'      => 'nullable|string|max:50',
            'profession_parent'    => 'nullable|string|max:100',
            'adresse_parent'       => 'nullable|string|max:200',
        ]);

        // Créer ou retrouver le parent
        $parent = Parents::where('numero_parent', $request->numero_parent)->first();
        if (!$parent) {
            $relationsValides = ['Père', 'Mère', 'Tuteur', 'Autre'];
            $relation = in_array($request->relation_parent, $relationsValides)
                ? $request->relation_parent
                : 'Autre';

            $parent = Parents::create([
                'nom_parent'        => $request->nom_parent,
                'prenom_parent'     => $request->prenom_parent,
                'numero_parent'     => $request->numero_parent,
                'email_parent'      => $request->email_parent,
                'relation_parent'   => $relation,
                'profession_parent' => $request->profession_parent,
                'adresse_parent'    => $request->adresse_parent,
                'password'          => Hash::make(Str::random(8)),
            ]);
        }

        $eleve = Eleve::create([
            'matricule_eleve'      => $this->genererMatricule(),
            'nom_eleve'            => $request->nom_eleve,
            'prenoms_eleve'        => $request->prenoms_eleve,
            'date_naissance_eleve' => $request->date_naissance_eleve,
            'genre_eleve'          => $request->genre_eleve,
            'lieu_naissance_eleve' => $request->lieu_naissance_eleve,
            'nationalite_eleve'    => $request->nationalite_eleve ?? 'Ivoirienne',
            'adresse_eleve'        => $request->adresse_eleve,
            'classe_id'            => $request->classe_id,
            'parent_id'            => $parent->id,
        ]);

        return response()->json([
            'message' => 'Inscription effectuée avec succès.',
            'eleve'   => $eleve->load('classe.niveau'),
            'parent'  => $parent,
        ], 201);
    }

    // ── Utilitaire ────────────────────────────────────────────────────────────

    private function genererMatricule(): string
    {
        do {
            $matricule = 'EL' . strtoupper(Str::random(6));
        } while (Eleve::where('matricule_eleve', $matricule)->exists());

        return $matricule;
    }
}
