<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\Parents;
use App\Models\ParentSubscription;
use App\Models\SchoolParentSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ParentRegistrationController extends Controller
{
    /**
     * Vérifie qu'un matricule est valide et retourne les infos de l'élève.
     * GET /api/mobile/parent/valider-matricule/{matricule}
     */
    public function validerMatricule(string $matricule)
    {
        $eleve = Eleve::with('classe.niveau')
            ->where('matricule_eleve', $matricule)
            ->first();

        if (! $eleve) {
            return response()->json(['message' => 'Matricule introuvable.'], 404);
        }

        // Vérifier la limite de 2 parents par élève
        $nbParents = $eleve->parents()->count();
        if ($nbParents >= 2) {
            return response()->json([
                'message' => 'Ce matricule a déjà 2 parents enregistrés.',
            ], 422);
        }

        return response()->json([
            'eleve' => [
                'id'       => $eleve->id,
                'nom'      => $eleve->nom_eleve,
                'prenoms'  => $eleve->prenoms_eleve,
                'classe'   => $eleve->classe->nom_classe ?? null,
                'niveau'   => $eleve->classe?->niveau?->libelle_niveau ?? null,
            ],
        ]);
    }

    /**
     * Inscription d'un parent avec liaison à son enfant via le matricule.
     * POST /api/mobile/parent/register
     */
    public function register(Request $request)
    {
        $request->validate([
            'nom_parent'      => 'required|string|max:100',
            'prenom_parent'   => 'required|string|max:100',
            'numero_parent'   => 'required|string|unique:parents,numero_parent',
            'password'        => 'required|string|min:6',
            'matricule_eleve' => 'required|string',
            'relation'        => 'nullable|in:Père,Mère,Tuteur,Autre',
        ]);

        $eleve = Eleve::where('matricule_eleve', $request->matricule_eleve)->first();

        if (! $eleve) {
            throw ValidationException::withMessages([
                'matricule_eleve' => 'Matricule introuvable.',
            ]);
        }

        if ($eleve->parents()->count() >= 2) {
            throw ValidationException::withMessages([
                'matricule_eleve' => 'Ce matricule a déjà 2 parents enregistrés.',
            ]);
        }

        $etablissement = Etablissement::firstOrFail();
        $mode          = $etablissement->parent_payment_mode;

        // Créer le compte parent
        $parent = Parents::create([
            'nom_parent'    => $request->nom_parent,
            'prenom_parent' => $request->prenom_parent,
            'numero_parent' => $request->numero_parent,
            'password'      => Hash::make($request->password),
        ]);

        // Lier au pivot eleve_parent
        $eleve->parents()->attach($parent->id, [
            'relation' => $request->relation,
        ]);

        // Gestion de l'abonnement
        $subscription = $this->gererAbonnement($eleve, $parent, $mode);

        // Générer le token si l'abonnement est actif
        $token = null;
        if ($subscription->statut === 'actif') {
            $token = $parent->createToken('parent-mobile', ['*'], now()->addDays(365))->plainTextToken;
        }

        return response()->json([
            'message'      => $this->messageSelon($mode, $subscription->statut),
            'statut'       => $subscription->statut,
            'token'        => $token,
            'parent'       => [
                'id'      => $parent->id,
                'nom'     => $parent->nom_parent,
                'prenom'  => $parent->prenom_parent,
                'numero'  => $parent->numero_parent,
            ],
        ], 201);
    }

    // ─── Admin : demandes en attente (mode school_collects) ───────────────────

    /**
     * Liste des demandes d'accès parent en attente de validation.
     * GET /api/parents/demandes
     */
    public function demandes()
    {
        $demandes = ParentSubscription::with(['eleve.classe', 'payeur'])
            ->where('statut', 'en_attente')
            ->where('payment_mode', 'school_collects')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($s) => [
                'subscription_id' => $s->id,
                'eleve'    => [
                    'id'        => $s->eleve->id,
                    'matricule' => $s->eleve->matricule_eleve,
                    'nom'       => $s->eleve->nom_eleve,
                    'prenoms'   => $s->eleve->prenoms_eleve,
                    'classe'    => $s->eleve->classe->nom_classe ?? null,
                ],
                'parents'  => $s->eleve->parents()->get()->map(fn ($p) => [
                    'id'     => $p->id,
                    'nom'    => $p->nom_parent,
                    'prenom' => $p->prenom_parent,
                    'numero' => $p->numero_parent,
                ]),
                'created_at' => $s->created_at,
            ]);

        return response()->json($demandes);
    }

    /**
     * Approuver une demande d'accès parent.
     * POST /api/parents/demandes/{id}/approuver
     */
    public function approuver(int $id)
    {
        $subscription = ParentSubscription::where('statut', 'en_attente')->findOrFail($id);

        $subscription->update([
            'statut'     => 'actif',
            'expires_at' => now()->addYear(),
        ]);

        // Incrémenter les slots utilisés
        SchoolParentSlot::first()?->increment('slots_utilises');

        return response()->json(['message' => 'Accès accordé.']);
    }

    /**
     * Rejeter une demande d'accès parent.
     * POST /api/parents/demandes/{id}/rejeter
     */
    public function rejeter(int $id)
    {
        $subscription = ParentSubscription::where('statut', 'en_attente')->findOrFail($id);
        $subscription->update(['statut' => 'annule']);

        return response()->json(['message' => 'Demande rejetée.']);
    }

    /**
     * État des slots parents de l'école.
     * GET /api/parents/slots
     */
    public function slots()
    {
        $slot = SchoolParentSlot::first();

        return response()->json([
            'slots_achetes'    => $slot?->slots_achetes ?? 0,
            'slots_utilises'   => $slot?->slots_utilises ?? 0,
            'slots_disponibles'=> $slot?->slotsDisponibles() ?? 0,
            'expires_at'       => $slot?->expires_at,
        ]);
    }

    /**
     * Configurer le mode de paiement de l'école.
     * PUT /api/etablissement/parent-payment-mode
     */
    public function configurerMode(Request $request)
    {
        $request->validate([
            'mode' => 'required|in:parent_self_pay,school_collects',
        ]);

        $etablissement = Etablissement::firstOrFail();
        $etablissement->update(['parent_payment_mode' => $request->mode]);

        return response()->json(['message' => 'Mode de paiement mis à jour.', 'mode' => $request->mode]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function gererAbonnement(Eleve $eleve, Parents $parent, string $mode): ParentSubscription
    {
        // Si l'élève a déjà un abonnement actif, le 2ème parent en bénéficie directement
        $existing = ParentSubscription::where('eleve_id', $eleve->id)
            ->where('statut', 'actif')
            ->first();

        if ($existing) {
            return $existing;
        }

        $statut = match ($mode) {
            'school_collects' => $this->verifierSlots() ? 'en_attente' : 'en_attente',
            default           => 'en_attente', // en attente de paiement CinetPay
        };

        return ParentSubscription::create([
            'eleve_id'     => $eleve->id,
            'statut'       => $statut,
            'payment_mode' => $mode,
            'paid_by'      => $parent->id,
        ]);
    }

    private function verifierSlots(): bool
    {
        $slot = SchoolParentSlot::first();

        return $slot !== null && $slot->aDesSlots();
    }

    private function messageSelon(string $mode, string $statut): string
    {
        if ($statut === 'actif') {
            return 'Compte créé avec succès. Vous pouvez vous connecter.';
        }

        return match ($mode) {
            'school_collects' => 'Compte créé. Votre demande est en attente de validation par l\'établissement.',
            'parent_self_pay' => 'Compte créé. Veuillez procéder au paiement pour activer votre accès.',
            default           => 'Compte créé.',
        };
    }
}
