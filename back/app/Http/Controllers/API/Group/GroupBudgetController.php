<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\Group;

use App\Http\Controllers\Controller;
use App\Models\BudgetDotation;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupBudgetController extends Controller
{
    /**
     * Liste consolidée des demandes de budget de tous les établissements actifs du groupe.
     * Boucle tenancy()->initialize()/->end(), pas de requête fédérée (cf. GroupDashboardController).
     */
    public function index(Request $request): JsonResponse
    {
        $group   = $request->user()->group;
        $tenants = $group->tenants()->where('actif', true)->get();
        $statut  = $request->query('statut');

        $demandes = [];

        foreach ($tenants as $tenant) {
            tenancy()->initialize($tenant);

            $query = BudgetDotation::with('demandeur:id,name')->orderBy('created_at', 'desc');
            if ($statut) $query->where('statut', $statut);

            foreach ($query->get() as $dotation) {
                $demandes[] = array_merge($dotation->toArray(), [
                    'tenant_id'  => $tenant->id,
                    'tenant_nom' => $tenant->nom,
                ]);
            }

            tenancy()->end();
        }

        usort($demandes, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return response()->json($demandes);
    }

    public function approuver(Request $request, string $tenantId, string $id): JsonResponse
    {
        $request->validate(['montant_octroye' => 'required|numeric|min:1']);

        return $this->statuer($request, $tenantId, $id, function (BudgetDotation $dotation) use ($request) {
            $dotation->update([
                'montant_octroye'  => $request->montant_octroye,
                'statut'           => BudgetDotation::STATUT_APPROUVEE,
                'validee_par_type' => BudgetDotation::VALIDEUR_GROUP_ADMIN,
                'validee_par_id'   => $request->user()->id,
                'validee_par_nom'  => $request->user()->nom,
                'validee_le'       => now(),
            ]);

            (new NotificationService())->notifierUser(
                $dotation->demandeur_id,
                'budget',
                'Demande de budget approuvée',
                "Votre demande {$dotation->reference} a été approuvée par la Direction Générale pour "
                    . number_format($dotation->montant_octroye, 0, ',', ' ') . ' FCFA.',
                ['dotation_id' => $dotation->id]
            );
        });
    }

    public function rejeter(Request $request, string $tenantId, string $id): JsonResponse
    {
        $request->validate(['commentaire_validation' => 'required|string']);

        return $this->statuer($request, $tenantId, $id, function (BudgetDotation $dotation) use ($request) {
            $dotation->update([
                'statut'                 => BudgetDotation::STATUT_REJETEE,
                'validee_par_type'       => BudgetDotation::VALIDEUR_GROUP_ADMIN,
                'validee_par_id'         => $request->user()->id,
                'validee_par_nom'        => $request->user()->nom,
                'validee_le'             => now(),
                'commentaire_validation' => $request->commentaire_validation,
            ]);

            (new NotificationService())->notifierUser(
                $dotation->demandeur_id,
                'budget',
                'Demande de budget rejetée',
                "Votre demande {$dotation->reference} a été rejetée par la Direction Générale : {$dotation->commentaire_validation}",
                ['dotation_id' => $dotation->id]
            );
        });
    }

    /**
     * Vérifie l'appartenance du tenant au groupe, initialise la tenancy, exécute
     * l'action sur la dotation puis referme la tenancy avant de répondre.
     */
    private function statuer(Request $request, string $tenantId, string $id, callable $action): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($tenantId);

        tenancy()->initialize($tenant);

        $dotation = BudgetDotation::find($id);
        if (!$dotation) {
            tenancy()->end();
            return response()->json(['message' => 'Demande introuvable.'], 404);
        }
        if ($dotation->statut !== BudgetDotation::STATUT_SOUMISE) {
            tenancy()->end();
            return response()->json(['message' => 'Seule une demande soumise peut être traitée.'], 422);
        }

        $action($dotation);
        // Sérialiser en tableau AVANT tenancy()->end() : un modèle Eloquent gardé "vivant"
        // évalue ses accesseurs (dates, connexion) au moment du json_encode(), qui a lieu
        // après le retour de cette méthode — donc après la fermeture de la connexion tenant.
        $resultat = $dotation->fresh()->load('demandeur:id,name')->toArray();

        tenancy()->end();

        return response()->json($resultat);
    }

    /**
     * Liste des utilisateurs de l'établissement parmi lesquels la DG peut désigner
     * son délégué. Aucun filtre par permission : la désignation elle-même est ce
     * qui accorde le pouvoir d'approuver, pas un rôle local préexistant.
     */
    public function delegables(Request $request, string $tenantId): JsonResponse
    {
        $tenant = $request->user()->group->tenants()->findOrFail($tenantId);

        tenancy()->initialize($tenant);
        $utilisateurs = \App\Models\User::where('actif', true)
            ->with('role:id,label')
            ->orderBy('name')
            ->get(['id', 'name', 'role_id'])
            ->map(fn($u) => ['id' => $u->id, 'name' => $u->name, 'role' => $u->role?->label])
            ->values();
        tenancy()->end();

        return response()->json($utilisateurs);
    }

    /**
     * Active/désactive la délégation d'approbation locale pour un établissement du
     * groupe, et désigne PRÉCISÉMENT la personne habilitée (pas un rôle générique).
     * Table centrale (tenants) : pas besoin d'initialiser la tenancy pour l'écriture,
     * seulement pour vérifier que l'utilisateur désigné existe bien dans ce tenant.
     */
    public function toggleDelegation(Request $request, string $tenantId): JsonResponse
    {
        $request->validate([
            'actif'   => 'required|boolean',
            'user_id' => 'required_if:actif,true|nullable|integer',
        ]);

        $tenant = $request->user()->group->tenants()->findOrFail($tenantId);

        if (!$request->boolean('actif')) {
            $tenant->update([
                'budget_delegation_active' => false,
                'budget_delegue_user_id'   => null,
                'budget_delegue_nom'       => null,
            ]);
            return response()->json($tenant->only(['id', 'nom', 'budget_delegation_active', 'budget_delegue_user_id', 'budget_delegue_nom']));
        }

        tenancy()->initialize($tenant);
        $utilisateur = \App\Models\User::find($request->user_id);
        tenancy()->end();

        if (!$utilisateur) {
            return response()->json(['message' => "Cet utilisateur n'existe pas dans cet établissement."], 422);
        }

        $tenant->update([
            'budget_delegation_active' => true,
            'budget_delegue_user_id'   => $utilisateur->id,
            'budget_delegue_nom'       => $utilisateur->name,
        ]);

        return response()->json($tenant->only(['id', 'nom', 'budget_delegation_active', 'budget_delegue_user_id', 'budget_delegue_nom']));
    }

    /**
     * Vue consolidée : octroyé/dépensé/solde par établissement + totaux du groupe.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $group   = $request->user()->group;
        $tenants = $group->tenants()->where('actif', true)->get();

        $ecoles = [];

        foreach ($tenants as $tenant) {
            tenancy()->initialize($tenant);

            $octroye = (float) BudgetDotation::where('statut', BudgetDotation::STATUT_APPROUVEE)->sum('montant_octroye');
            $depense = (float) \App\Models\BudgetDepense::sum('montant');

            $ecoles[] = [
                'id'                        => $tenant->id,
                'nom'                       => $tenant->nom,
                'budget_delegation_active'  => (bool) $tenant->budget_delegation_active,
                'budget_delegue_user_id'    => $tenant->budget_delegue_user_id,
                'budget_delegue_nom'        => $tenant->budget_delegue_nom,
                'octroye'                   => $octroye,
                'depense'                   => $depense,
                'solde'                     => $octroye - $depense,
            ];

            tenancy()->end();
        }

        return response()->json([
            'groupe' => ['id' => $group->id, 'nom' => $group->nom],
            'ecoles' => $ecoles,
            'totaux' => [
                'octroye' => array_sum(array_column($ecoles, 'octroye')),
                'depense' => array_sum(array_column($ecoles, 'depense')),
                'solde'   => array_sum(array_column($ecoles, 'solde')),
            ],
        ]);
    }
}
