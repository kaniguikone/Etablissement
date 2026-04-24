<?php

namespace App\Http\Controllers\API\Group;

use App\Services\TemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class TemplateController extends Controller
{
    public function __construct(private TemplateService $service) {}

    /**
     * GET /api/group/templates
     * Liste les templates disponibles.
     */
    public function index(): JsonResponse
    {
        return response()->json(
            collect(TemplateService::liste())->map(fn($t, $k) => array_merge($t, ['type' => $k]))->values()
        );
    }

    /**
     * GET /api/group/templates/{type}
     * Retourne le contenu complet d'un template.
     */
    public function show(string $type): JsonResponse
    {
        try {
            return response()->json(TemplateService::charger($type));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }
    }

    /**
     * PUT /api/group/templates/{type}
     * Met à jour les matières et coefficients d'un template.
     */
    public function update(Request $request, string $type): JsonResponse
    {
        $request->validate([
            'matieres'                           => 'required|array',
            'matieres.*.libelle_matiere'         => 'required|string',
            'matieres.*.abbr_matiere'            => 'required|string',
            'niveau_series'                      => 'nullable|array',
            'niveau_series.*.niveau'             => 'required|string',
            'niveau_series.*.series'             => 'present|array',
            'niveau_matieres'                    => 'required|array',
            'niveau_matieres.*.niveau'           => 'required|string',
            'niveau_matieres.*.matiere'          => 'required|string',
            'niveau_matieres.*.coefficient'      => 'required|integer|min:0',
            'niveau_matieres.*.heures_semaine'   => 'required|integer|min:0',
            'chapitres'                          => 'nullable|array',
            'chapitres.*.niveau'                 => 'required|string',
            'chapitres.*.matiere'                => 'required|string',
            'chapitres.*.titre'                  => 'required|string',
            'chapitres.*.ordre'                  => 'required|integer|min:1',
            'periodes_trimestre'                 => 'nullable|array',
            'periodes_semestre'                  => 'nullable|array',
        ]);

        try {
            $template = TemplateService::charger($type);
            $template['matieres']          = $request->matieres;
            $template['niveau_series']     = $request->niveau_series    ?? $template['niveau_series']    ?? [];
            $template['chapitres']         = $request->chapitres         ?? $template['chapitres']         ?? [];
            $template['niveau_matieres']   = $request->niveau_matieres;
            $template['periodes_trimestre']= $request->periodes_trimestre ?? $template['periodes_trimestre'] ?? [];
            $template['periodes_semestre'] = $request->periodes_semestre  ?? $template['periodes_semestre']  ?? [];
            TemplateService::sauvegarder($type, $template);

            return response()->json(['message' => 'Template mis à jour avec succès.']);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }
    }

    /**
     * POST /api/group/tenants/{tenantId}/apply-template
     * Applique un template à un établissement.
     */
    public function appliquer(Request $request, string $tenantId): JsonResponse
    {
        $request->validate([
            'type'         => 'required|string|in:lycee,lycee_complet,college,primaire',
            'annee'        => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
            'periodes_type'=> 'nullable|string|in:trimestre,semestre',
        ]);

        try {
            $stats = $this->service->appliquer(
                $tenantId,
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
            return response()->json(['message' => 'Erreur lors de l\'application du template : ' . $e->getMessage()], 500);
        }
    }
}
