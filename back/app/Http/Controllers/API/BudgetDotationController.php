<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\BudgetDotation;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BudgetDotationController extends Controller
{
    public function index(Request $request)
    {
        $query = BudgetDotation::with('demandeur:id,name')->orderBy('created_at', 'desc');

        if ($request->filled('statut'))            $query->where('statut', $request->statut);
        if ($request->filled('annee_scolaire_id'))  $query->where('annee_scolaire_id', $request->annee_scolaire_id);

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'annee_scolaire_id' => 'required|exists:annees_scolaires,id',
            'montant_demande'   => 'required|numeric|min:1',
            'motif'              => 'required|string',
            'soumettre'          => 'boolean',
        ]);

        $dotation = DB::transaction(function () use ($request) {
            $annee = AnneeScolaire::findOrFail($request->annee_scolaire_id);

            $sequence = BudgetDotation::where('annee_scolaire_id', $annee->id)->count() + 1;
            // Le code établissement (unique, cf. Tenant::code) évite que deux écoles du
            // même groupe génèrent la même référence visible côte à côte dans la vue
            // consolidée DG (GroupBudgetController::index) — la séquence seule seule
            // n'est unique qu'au sein d'une base tenant, pas entre établissements.
            $codeTenant = tenant()?->code ?? 'XXXXXX';
            $reference = sprintf('BUD-%s-%s-%03d', $codeTenant, $annee->libelle, $sequence);

            return BudgetDotation::create([
                'annee_scolaire_id' => $annee->id,
                'demandeur_id'      => $request->user()->id,
                'reference'         => $reference,
                'montant_demande'   => $request->montant_demande,
                'motif'             => $request->motif,
                'statut'            => $request->boolean('soumettre')
                    ? BudgetDotation::STATUT_SOUMISE
                    : BudgetDotation::STATUT_BROUILLON,
            ]);
        });

        if ($dotation->statut === BudgetDotation::STATUT_SOUMISE) {
            $this->notifierSoumission($dotation);
        }

        return response()->json($dotation->load('demandeur:id,name'), 201);
    }

    public function update(Request $request, string $id)
    {
        $dotation = BudgetDotation::findOrFail($id);

        if ($dotation->statut !== BudgetDotation::STATUT_BROUILLON) {
            return response()->json(['message' => 'Seule une demande en brouillon peut être modifiée.'], 422);
        }

        $request->validate([
            'montant_demande' => 'required|numeric|min:1',
            'motif'            => 'required|string',
        ]);

        $dotation->update($request->only(['montant_demande', 'motif']));

        return response()->json($dotation->load('demandeur:id,name'));
    }

    public function destroy(string $id)
    {
        $dotation = BudgetDotation::findOrFail($id);

        if ($dotation->statut !== BudgetDotation::STATUT_BROUILLON) {
            return response()->json(['message' => 'Seule une demande en brouillon peut être supprimée.'], 422);
        }

        $dotation->delete();
        return response()->json(null, 204);
    }

    public function soumettre(Request $request, string $id)
    {
        $dotation = BudgetDotation::findOrFail($id);

        if ($dotation->statut !== BudgetDotation::STATUT_BROUILLON) {
            return response()->json(['message' => 'Cette demande a déjà été soumise.'], 422);
        }

        $dotation->update(['statut' => BudgetDotation::STATUT_SOUMISE]);
        $this->notifierSoumission($dotation);

        return response()->json($dotation->load('demandeur:id,name'));
    }

    public function approuver(Request $request, string $id)
    {
        $refus = $this->refuserSiApprobationNonAutorisee($request);
        if ($refus) return $refus;

        $dotation = BudgetDotation::findOrFail($id);

        if ($dotation->statut !== BudgetDotation::STATUT_SOUMISE) {
            return response()->json(['message' => 'Seule une demande soumise peut être approuvée.'], 422);
        }

        $request->validate(['montant_octroye' => 'required|numeric|min:1']);

        $dotation->update([
            'montant_octroye'  => $request->montant_octroye,
            'statut'           => BudgetDotation::STATUT_APPROUVEE,
            'validee_par_type' => BudgetDotation::VALIDEUR_USER,
            'validee_par_id'   => $request->user()->id,
            'validee_par_nom'  => $request->user()->name,
            'validee_le'       => now(),
        ]);

        $this->notifierDecision($dotation, approuvee: true);

        return response()->json($dotation->load('demandeur:id,name'));
    }

    public function rejeter(Request $request, string $id)
    {
        $refus = $this->refuserSiApprobationNonAutorisee($request);
        if ($refus) return $refus;

        $dotation = BudgetDotation::findOrFail($id);

        if ($dotation->statut !== BudgetDotation::STATUT_SOUMISE) {
            return response()->json(['message' => 'Seule une demande soumise peut être rejetée.'], 422);
        }

        $request->validate(['commentaire_validation' => 'required|string']);

        $dotation->update([
            'statut'                  => BudgetDotation::STATUT_REJETEE,
            'validee_par_type'        => BudgetDotation::VALIDEUR_USER,
            'validee_par_id'          => $request->user()->id,
            'validee_par_nom'         => $request->user()->name,
            'validee_le'              => now(),
            'commentaire_validation'  => $request->commentaire_validation,
        ]);

        $this->notifierDecision($dotation, approuvee: false);

        return response()->json($dotation->load('demandeur:id,name'));
    }

    /**
     * Indique si l'utilisateur courant peut approuver/rejeter dans cet établissement,
     * et pourquoi pas sinon — utilisé à la fois pour bloquer côté serveur (§5.1) et
     * pour que le front sache s'il doit afficher les boutons approuver/rejeter
     * (GET /budget/peut-valider), au lieu de se fier à la seule permission locale qui
     * ne reflète pas la règle réelle pour un établissement de groupe.
     */
    public function peutValider(Request $request)
    {
        return response()->json($this->autorisationValidation($request));
    }

    /**
     * Garde-fou §5.1 du cadrage : dans un établissement membre d'un groupe, seule la
     * DG approuve/rejette, sauf délégation explicitement activée pour ce tenant — et
     * dans ce cas, seule la personne PRÉCISÉMENT désignée par la DG (pas n'importe
     * qui ayant un rôle local) peut agir. La désignation elle-même est ce qui donne
     * le pouvoir, indépendamment des permissions/rôle habituels de cette personne.
     */
    private function autorisationValidation(Request $request): array
    {
        $t = tenant();
        if (!$t || $t->group_id === null) {
            // Établissement autonome : pas de DG à qui déléguer, on retombe sur la
            // permission locale habituelle (le middleware ne fait plus ce contrôle
            // depuis que la route est partagée avec le cas "délégué désigné").
            if (!$request->user()->peutFaire('budget_validation')) {
                return ['autorise' => false, 'motif' => 'Accès refusé.'];
            }
            return ['autorise' => true, 'motif' => null];
        }

        if (!$t->budget_delegation_active || $t->budget_delegue_user_id === null) {
            return ['autorise' => false, 'motif' => 'Cette demande doit être validée par la Direction Générale du groupe.'];
        }

        if ((int) $t->budget_delegue_user_id !== (int) $request->user()->id) {
            return [
                'autorise' => false,
                'motif'    => "Seule la personne désignée par la Direction Générale ({$t->budget_delegue_nom}) peut valider les demandes de cet établissement.",
            ];
        }

        return ['autorise' => true, 'motif' => null];
    }

    private function refuserSiApprobationNonAutorisee(Request $request)
    {
        $autorisation = $this->autorisationValidation($request);
        if (!$autorisation['autorise']) {
            return response()->json(['message' => $autorisation['motif']], 403);
        }
        return null;
    }

    private function notifierSoumission(BudgetDotation $dotation): void
    {
        $notif = new NotificationService();
        \App\Models\User::whereHas('role', fn($q) => $q->whereJsonContains('permissions', 'budget_validation')->orWhere('super', true))
            ->get()
            ->each(fn($u) => $notif->notifierUser(
                $u->id,
                'budget',
                'Nouvelle demande de budget',
                "Demande {$dotation->reference} : " . number_format($dotation->montant_demande, 0, ',', ' ') . ' FCFA.',
                ['dotation_id' => $dotation->id]
            ));
    }

    private function notifierDecision(BudgetDotation $dotation, bool $approuvee): void
    {
        (new NotificationService())->notifierUser(
            $dotation->demandeur_id,
            'budget',
            $approuvee ? 'Demande de budget approuvée' : 'Demande de budget rejetée',
            $approuvee
                ? "Votre demande {$dotation->reference} a été approuvée pour " . number_format($dotation->montant_octroye, 0, ',', ' ') . ' FCFA.'
                : "Votre demande {$dotation->reference} a été rejetée : {$dotation->commentaire_validation}",
            ['dotation_id' => $dotation->id]
        );
    }
}
