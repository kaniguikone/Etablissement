<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\Parents;
use App\Models\ParentSubscription;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ParentCentralController extends Controller
{
    /**
     * Étape 1 — Vérifier code MENET + matricule.
     * GET /parent/valider-matricule
     */
    public function validerMatricule(Request $request): JsonResponse
    {
        $request->validate([
            'code_menet' => 'required|string',
            'matricule'  => 'required|string',
        ]);

        $tenant = Tenant::where('code', strtoupper(trim($request->code_menet)))->first();

        if (! $tenant) {
            return response()->json(['message' => 'Code MENET introuvable. Vérifiez le code de l\'établissement.'], 404);
        }

        if (! $tenant->actif) {
            return response()->json(['message' => 'Cet établissement n\'a pas encore d\'accès actif.'], 403);
        }

        tenancy()->initialize($tenant);

        try {
            $eleve = Eleve::with('classe.niveau')
                ->where('matricule_eleve', strtoupper(trim($request->matricule)))
                ->first();

            if (! $eleve) {
                return response()->json(['message' => 'Matricule introuvable. Vérifiez le bulletin ou la carte scolaire.'], 404);
            }

            if ($eleve->parents()->count() >= 2) {
                return response()->json(['message' => 'Ce matricule a déjà 2 parents enregistrés.'], 422);
            }

            $etablissement = Etablissement::first();

            $result = [
                'tenant_id'      => $tenant->id,
                'etablissement'  => $etablissement?->nom ?? $tenant->nom,
                'eleve' => [
                    'id'      => $eleve->id,
                    'nom'     => $eleve->nom_eleve,
                    'prenoms' => $eleve->prenoms_eleve,
                    'classe'  => $eleve->classe?->nom_classe,
                    'niveau'  => $eleve->classe?->niveau?->libelle_niveau,
                ],
            ];
        } finally {
            tenancy()->end();
        }

        return response()->json($result);
    }

    /**
     * Étape 2 — Créer le compte parent dans le bon tenant.
     * POST /parent/inscription
     */
    public function inscrire(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id'       => 'required|string',
            'matricule_eleve' => 'required|string',
            'nom_parent'      => 'required|string|max:100',
            'prenom_parent'   => 'required|string|max:100',
            'numero_parent'   => 'required|string|max:30',
            'password'        => 'required|string|min:6',
            'relation'        => 'nullable|in:Père,Mère,Tuteur,Autre',
        ]);

        $tenant = Tenant::find($request->tenant_id);

        if (! $tenant) {
            return response()->json(['message' => 'Établissement introuvable.'], 404);
        }

        tenancy()->initialize($tenant);

        try {
            // Vérification doublon numéro
            if (Parents::where('numero_parent', $request->numero_parent)->exists()) {
                throw ValidationException::withMessages([
                    'numero_parent' => ['Ce numéro est déjà associé à un compte.'],
                ]);
            }

            $eleve = Eleve::where('matricule_eleve', strtoupper(trim($request->matricule_eleve)))->first();

            if (! $eleve) {
                return response()->json(['message' => 'Matricule introuvable.'], 404);
            }

            if ($eleve->parents()->count() >= 2) {
                return response()->json(['message' => 'Ce matricule a déjà 2 parents enregistrés.'], 422);
            }

            $parent = Parents::create([
                'nom_parent'    => $request->nom_parent,
                'prenom_parent' => $request->prenom_parent,
                'numero_parent' => $request->numero_parent,
                'password'      => Hash::make($request->password),
            ]);

            $eleve->parents()->attach($parent->id, [
                'relation' => $request->relation,
            ]);

            // Abonnement en attente de paiement
            ParentSubscription::create([
                'eleve_id'     => $eleve->id,
                'statut'       => 'en_attente',
                'payment_mode' => 'parent_self_pay',
                'paid_by'      => $parent->id,
            ]);
        } finally {
            tenancy()->end();
        }

        return response()->json([
            'message' => 'Compte créé avec succès. Présentez-vous à l\'établissement pour finaliser le paiement et activer votre accès mobile.',
            'statut'  => 'en_attente',
        ], 201);
    }
}
