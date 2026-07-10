<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CentralParentLink;
use App\Models\CentralUser;
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
     * Connexion centrale — retourne un token par école où le parent a un lien actif.
     * POST /api/parent/login
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'telephone' => 'required|string',
            'password'  => 'required|string',
        ]);

        $central = CentralUser::where('telephone', $request->telephone)->first();

        if (! $central || ! Hash::check($request->password, $central->password)) {
            return response()->json(['message' => 'Numéro ou mot de passe incorrect.'], 401);
        }

        $links = $central->parentLinksActifs()->get();

        $parTenant = $links->groupBy('tenant_id');

        $ecoles = [];

        foreach ($parTenant as $tenantId => $tenantLinks) {
            $tenant = Tenant::find($tenantId);
            if (! $tenant || ! $tenant->actif) {
                continue;
            }

            tenancy()->initialize($tenant);

            try {
                $parentLocal = Parents::where('central_user_id', $central->id)->first()
                    ?? Parents::where('numero_parent', $central->telephone)->first();

                if (! $parentLocal) {
                    continue;
                }

                $parentLocal->tokens()->where('name', 'central-parent-mobile')->delete();
                $token = $parentLocal->createToken('central-parent-mobile', ['*'], now()->addDays(30))
                                     ->plainTextToken;

                $etablissement = Etablissement::first();
                $domain        = $tenant->domains()->first()?->domain ?? $tenantId;

                $enfants = [];
                foreach ($tenantLinks as $link) {
                    $eleve = Eleve::with('classe.niveau')
                        ->where('matricule_eleve', $link->matricule_eleve)
                        ->first();

                    if (! $eleve) {
                        continue;
                    }

                    $enfants[] = [
                        'id'        => $eleve->id,
                        'matricule' => $eleve->matricule_eleve,
                        'nom'       => $eleve->nom_eleve,
                        'prenoms'   => $eleve->prenoms_eleve,
                        'classe'    => $eleve->classe?->nom_classe,
                        'niveau'    => $eleve->classe?->niveau?->libelle_niveau,
                        'photo_url' => $eleve->photo_url,
                    ];
                }

                if (empty($enfants)) {
                    continue;
                }

                $ecoles[] = [
                    'tenant_id' => $tenantId,
                    'nom'       => $etablissement?->nom ?? $tenantId,
                    'domain'    => $domain,
                    'token'     => $token,
                    'enfants'   => $enfants,
                ];
            } finally {
                tenancy()->end();
            }
        }

        return response()->json([
            'parent' => [
                'id'        => $central->id,
                'nom'       => $central->nom,
                'prenom'    => $central->prenom,
                'telephone' => $central->telephone,
            ],
            'ecoles' => $ecoles,
        ]);
    }

    /**
     * Étape 1 — Vérifier code MENET + matricule.
     * GET /api/parent/valider-matricule
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
                'tenant_id'     => $tenant->id,
                'etablissement' => $etablissement?->nom ?? $tenant->id,
                'eleve'         => [
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
     * Étape 2 — Créer le compte parent central + local dans le tenant.
     * POST /api/parent/inscription
     */
    public function inscrire(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id'       => 'required|string',
            'matricule_eleve' => 'required|string',
            'nom_parent'      => 'required|string|max:100',
            'prenom_parent'   => 'required|string|max:100',
            'telephone'       => 'required|string|max:30',
            'password'        => 'required|string|min:6',
            'relation'        => 'nullable|in:Père,Mère,Tuteur,Autre',
        ]);

        $tenant = Tenant::find($request->tenant_id);

        if (! $tenant) {
            return response()->json(['message' => 'Établissement introuvable.'], 404);
        }

        $matricule = strtoupper(trim($request->matricule_eleve));

        $central = CentralUser::firstOrCreate(
            ['telephone' => $request->telephone],
            [
                'nom'      => $request->nom_parent,
                'prenom'   => $request->prenom_parent,
                'password' => Hash::make($request->password),
            ]
        );

        $dejaInscrit = CentralParentLink::where('central_user_id', $central->id)
            ->where('tenant_id', $tenant->id)
            ->where('matricule_eleve', $matricule)
            ->exists();

        if ($dejaInscrit) {
            return response()->json(['message' => 'Vous suivez déjà cet élève dans cet établissement.'], 422);
        }

        tenancy()->initialize($tenant);

        try {
            if (Parents::where('numero_parent', $request->telephone)
                       ->where('central_user_id', '!=', $central->id)
                       ->exists()) {
                throw ValidationException::withMessages([
                    'telephone' => ['Ce numéro est déjà associé à un autre compte dans cet établissement.'],
                ]);
            }

            $eleve = Eleve::where('matricule_eleve', $matricule)->first();

            if (! $eleve) {
                return response()->json(['message' => 'Matricule introuvable.'], 404);
            }

            if ($eleve->parents()->count() >= 2) {
                return response()->json(['message' => 'Ce matricule a déjà 2 parents enregistrés.'], 422);
            }

            $parentLocal = Parents::firstOrCreate(
                ['numero_parent' => $request->telephone],
                [
                    'nom_parent'     => $request->nom_parent,
                    'prenom_parent'  => $request->prenom_parent,
                    'password'       => Hash::make($request->password),
                    'central_user_id' => $central->id,
                ]
            );

            if ($parentLocal->central_user_id !== $central->id) {
                $parentLocal->updateQuietly(['central_user_id' => $central->id]);
            }

            if (! $parentLocal->eleves()->where('eleve_id', $eleve->id)->exists()) {
                $eleve->parents()->attach($parentLocal->id, ['relation' => $request->relation]);
            }

            ParentSubscription::firstOrCreate(
                ['eleve_id' => $eleve->id, 'paid_by' => $parentLocal->id],
                [
                    'statut'       => 'en_attente',
                    'payment_mode' => 'parent_self_pay',
                ]
            );
        } finally {
            tenancy()->end();
        }

        CentralUser::ajouterEnfant($central, $tenant->id, $matricule, 'parent_self_pay');

        return response()->json([
            'message' => 'Compte créé avec succès. Présentez-vous à l\'établissement pour finaliser le paiement et activer votre accès mobile.',
            'statut'  => 'en_attente',
        ], 201);
    }
}
