<?php

namespace App\Http\Controllers\API\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AbonnementSaas;
use App\Models\FactureSaas;
use App\Models\Tenant;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AbonnementSaasController extends Controller
{
    // ── Dashboard billing ─────────────────────────────────────────────────

    /**
     * Liste tous les tenants avec leur statut d'abonnement courant.
     * Inclut les alertes d'expiration.
     */
    public function index(Request $request)
    {
        $tenants = Tenant::with(['domains', 'abonnements' => function ($q) {
            $q->orderBy('date_fin', 'desc')->limit(1);
        }])->orderBy('nom')->get();

        $maintenant  = Carbon::today();
        $alerte30j   = Carbon::today()->addDays(30);

        $data = $tenants->map(function ($t) use ($maintenant, $alerte30j) {
            $dernierAbo = $t->abonnements->first();
            $expiration = $t->date_expiration;

            $statut = 'actif';
            if (!$t->actif) {
                $statut = 'desactive';
            } elseif ($expiration && $expiration->isPast()) {
                $statut = 'expire';
            } elseif ($expiration && $expiration->lessThanOrEqualTo($alerte30j)) {
                $statut = 'expire_bientot';
            }

            return [
                'id'                => $t->id,
                'nom'               => $t->nom,
                'code'              => $t->code,
                'domaine'           => $t->domains->first()?->domain,
                'actif'             => $t->actif,
                'date_expiration'   => $t->date_expiration?->format('Y-m-d'),
                'jours_restants'    => $expiration ? max(0, $maintenant->diffInDays($expiration, false)) : null,
                'statut'            => $statut,
                'dernier_abonnement'=> $dernierAbo,
            ];
        });

        // Statistiques globales
        $stats = [
            'total'          => $tenants->count(),
            'actifs'         => $data->where('statut', 'actif')->count(),
            'expires'        => $data->where('statut', 'expire')->count(),
            'expire_bientot' => $data->where('statut', 'expire_bientot')->count(),
            'desactives'     => $data->where('statut', 'desactive')->count(),
        ];

        return response()->json(['tenants' => $data, 'stats' => $stats]);
    }

    // ── Abonnements d'un tenant ───────────────────────────────────────────

    public function historique(string $tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);
        $abonnements = AbonnementSaas::with('facture')
            ->where('tenant_id', $tenantId)
            ->orderBy('date_debut', 'desc')
            ->get();

        return response()->json([
            'tenant'      => $tenant,
            'abonnements' => $abonnements,
        ]);
    }

    // ── Créer / renouveler un abonnement ─────────────────────────────────

    public function store(Request $request)
    {
        $request->validate([
            'tenant_id'          => 'required|exists:tenants,id',
            'periode'            => 'required|in:mensuel,annuel,offert,personnalise',
            'date_debut'         => 'required|date',
            'duree_mois'         => 'nullable|integer|min:1|max:120',
            'montant_ht'         => 'required|numeric|min:0',
            'taux_tva'           => 'nullable|numeric|min:0|max:100',
            'mode_paiement'      => 'nullable|in:especes,cheque,virement,mobile_money,offert',
            'reference_paiement' => 'nullable|string|max:100',
            'notes'              => 'nullable|string|max:500',
            'avec_facture'       => 'boolean',
        ]);

        $periodeLabel = $request->periode;
        $dateDebut    = Carbon::parse($request->date_debut);

        // Calculer la date de fin
        $dateFin = match ($periodeLabel) {
            'mensuel'      => $dateDebut->copy()->addMonth(),
            'annuel'       => $dateDebut->copy()->addYear(),
            'offert'       => $dateDebut->copy()->addDays(30),
            'personnalise' => $dateDebut->copy()->addMonths((int) $request->input('duree_mois', 1)),
        };

        // Montant négocié avec l'établissement, saisi manuellement par le super-admin
        // (le tarif licence/élève affiché publiquement n'est qu'indicatif)
        $montantHt  = (float) $request->montant_ht;
        $tauxTva    = (float) $request->input('taux_tva', 18.0);
        $montantTtc = $montantHt * (1 + $tauxTva / 100);

        DB::transaction(function () use ($request, $dateDebut, $dateFin, $montantHt, $tauxTva, $montantTtc, &$abonnement) {
            // Créer l'abonnement
            $abonnement = AbonnementSaas::create([
                'tenant_id'          => $request->tenant_id,
                'periode'            => $request->periode,
                'date_debut'         => $dateDebut,
                'date_fin'           => $dateFin,
                'montant_ht'         => $montantHt,
                'taux_tva'           => $tauxTva,
                'montant_ttc'        => $montantTtc,
                'mode_paiement'      => $request->input('mode_paiement', 'virement'),
                'reference_paiement' => $request->reference_paiement,
                'statut'             => $request->periode === 'offert' ? 'offert' : 'actif',
                'notes'              => $request->notes,
                'created_by'         => auth()->id(),
            ]);

            // Mettre à jour la date d'expiration du tenant
            Tenant::where('id', $request->tenant_id)->update([
                'date_expiration' => $dateFin,
            ]);

            // Générer la facture si demandé et montant > 0
            if ($request->boolean('avec_facture', true) && $montantHt > 0) {
                FactureSaas::create([
                    'reference'    => FactureSaas::genererReference(),
                    'abonnement_id'=> $abonnement->id,
                    'tenant_id'    => $request->tenant_id,
                    'montant_ht'   => $montantHt,
                    'taux_tva'     => $tauxTva,
                    'montant_tva'  => $montantHt * ($tauxTva / 100),
                    'montant_ttc'  => $montantTtc,
                    'date_emission'=> today(),
                    'date_echeance'=> today()->addDays(30),
                    'statut'       => 'emise',
                ]);
            }
        });

        return response()->json($abonnement->load(['facture', 'tenant']), 201);
    }

    // ── PDF Facture ───────────────────────────────────────────────────────

    public function telechargerFacture(string $factureId)
    {
        $facture = FactureSaas::with(['abonnement', 'tenant.domains'])->findOrFail($factureId);

        $pdf = Pdf::loadView('billing.facture_saas', ['facture' => $facture])
            ->setPaper('A4', 'portrait');

        $filename = "facture_{$facture->reference}.pdf";

        return $pdf->download($filename);
    }

    // ── Marquer une facture comme payée ───────────────────────────────────

    public function marquerPayee(string $factureId)
    {
        $facture = FactureSaas::findOrFail($factureId);
        $facture->update(['statut' => 'payee']);

        // Mettre à jour le statut de l'abonnement associé
        $facture->abonnement?->update(['statut' => 'actif']);

        return response()->json($facture);
    }
}
