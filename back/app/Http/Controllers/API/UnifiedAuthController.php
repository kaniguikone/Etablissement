<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CentralUser;
use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Etablissement;
use App\Models\Parents;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UnifiedAuthController extends Controller
{
    /**
     * Connexion unifiée — retourne tous les rôles actifs du compte central.
     * POST /mobile/login  (route tenant, mais CentralUser pointe toujours sur la DB centrale)
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'numero'   => 'required|string',
            'password' => 'required|string',
        ]);

        $central = CentralUser::where('telephone', $request->numero)->first();

        if (! $central || ! Hash::check($request->password, $central->password)) {
            return response()->json(['message' => 'Numéro ou mot de passe incorrect.'], 401);
        }

        $roles = [];
        $data  = [];

        // ── Rôle parent ────────────────────────────────────────────────────────
        $parentLinks = $central->parentLinksActifs()->get();

        if ($parentLinks->isNotEmpty()) {
            $ecolesParent = [];

            foreach ($parentLinks->groupBy('tenant_id') as $tenantId => $tenantLinks) {
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
                            'photo_url' => $eleve->photo_url ?? null,
                        ];
                    }

                    if (empty($enfants)) {
                        continue;
                    }

                    $ecolesParent[] = [
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

            if (! empty($ecolesParent)) {
                $roles[]             = 'parent_central';
                $data['parent_central'] = [
                    'id'        => $central->id,
                    'nom'       => $central->nom,
                    'prenom'    => $central->prenom,
                    'telephone' => $central->telephone,
                    'ecoles'    => $ecolesParent,
                ];
            }
        }

        // ── Rôle enseignant ────────────────────────────────────────────────────
        $enseignantLinks = $central->enseignantLinksActifs()->get();

        if ($enseignantLinks->isNotEmpty()) {
            $ecolesEnseignant = [];

            foreach ($enseignantLinks as $link) {
                $tenant = Tenant::find($link->tenant_id);
                if (! $tenant || ! $tenant->actif) {
                    continue;
                }

                tenancy()->initialize($tenant);

                try {
                    $enseignant = Enseignant::find($link->local_enseignant_id);

                    if (! $enseignant) {
                        continue;
                    }

                    $enseignant->tokens()->where('name', 'central-enseignant-mobile')->delete();
                    $token = $enseignant->createToken('central-enseignant-mobile', ['*'], now()->addDays(30))
                                        ->plainTextToken;

                    $etablissement = Etablissement::first();
                    $domain        = $tenant->domains()->first()?->domain ?? $link->tenant_id;

                    $ecolesEnseignant[] = [
                        'tenant_id'     => $link->tenant_id,
                        'nom'           => $etablissement?->nom ?? $link->tenant_id,
                        'domain'        => $domain,
                        'token'         => $token,
                        'enseignant_id' => $enseignant->id,
                    ];
                } finally {
                    tenancy()->end();
                }
            }

            if (! empty($ecolesEnseignant)) {
                $roles[]                  = 'enseignant_central';
                $data['enseignant_central'] = [
                    'id'        => $central->id,
                    'nom'       => $central->nom,
                    'prenom'    => $central->prenom,
                    'telephone' => $central->telephone,
                    'ecoles'    => $ecolesEnseignant,
                ];
            }
        }

        if (empty($roles)) {
            return response()->json(['message' => 'Aucun accès actif pour ce numéro.'], 401);
        }

        return response()->json([
            'roles' => $roles,
            'data'  => $data,
        ]);
    }
}
