<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\TemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SelfTemplateController extends Controller
{
    public function __construct(private TemplateService $service) {}

    /**
     * GET /api/templates
     * Liste les templates disponibles (pour la page de démarrage).
     */
    public function index(): JsonResponse
    {
        return response()->json(
            collect(TemplateService::liste())
                ->map(fn($t, $k) => array_merge($t, ['type' => $k]))
                ->values()
        );
    }

    /**
     * POST /api/self/apply-template
     * Permet à un établissement indépendant d'appliquer un template sur lui-même.
     * Appelé depuis l'intérieur du tenant (tenancy déjà actif).
     */
    public function appliquer(Request $request): JsonResponse
    {
        $request->validate([
            'type'          => 'required|string|in:lycee,lycee_complet,college,primaire',
            'annee'         => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
            'periodes_type' => 'nullable|string|in:trimestre,semestre',
        ]);

        // Bloquer si l'établissement appartient à un groupe
        // (l'admin groupe doit faire cette opération depuis son espace)
        if (tenant()?->group_id) {
            return response()->json([
                'message' => 'Cette action est réservée aux établissements indépendants. Contactez votre administrateur de groupe.',
            ], 403);
        }

        try {
            $stats = $this->appliquerSurTenantActif(
                $request->type,
                $request->annee,
                $request->periodes_type ?? 'trimestre'
            );

            return response()->json([
                'message' => 'Template appliqué avec succès.',
                'stats'   => $stats,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    /**
     * Version du TemplateService qui fonctionne quand le tenant est déjà actif
     * (sans appeler tenancy()->initialize()).
     */
    private function appliquerSurTenantActif(string $type, string $annee, string $periodesType): array
    {
        // On réutilise le TemplateService mais en passant l'ID du tenant courant.
        // tenancy()->initialize() est idempotent si on est déjà sur le bon tenant.
        return $this->service->appliquer(tenant()->getTenantKey(), $type, $annee, $periodesType);
    }
}
