<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ConfigSaas;
use App\Models\Eleve;
use App\Models\Parents;
use App\Models\Tenant;
use App\Services\AnonymisationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RgpdController extends Controller
{
    private const CLE_RETENTION = 'duree_retention_annees';
    private const DEFAUT_RETENTION = 10;

    /** GET /rgpd/config — public, alimente la page politique de confidentialité. */
    public function configPublique(): JsonResponse
    {
        return response()->json([
            'duree_retention_annees' => (int) ConfigSaas::valeur(self::CLE_RETENTION, self::DEFAUT_RETENTION),
        ]);
    }

    /** GET /superadmin/rgpd/config */
    public function config(): JsonResponse
    {
        return $this->configPublique();
    }

    /** PUT /superadmin/rgpd/config */
    public function updateConfig(Request $request): JsonResponse
    {
        $data = $request->validate([
            'duree_retention_annees' => 'required|integer|min:1|max:50',
        ]);

        ConfigSaas::definir(self::CLE_RETENTION, (string) $data['duree_retention_annees']);

        return response()->json(['message' => 'Durée de rétention enregistrée.']);
    }

    /** GET /superadmin/rgpd/tenants/{tenantId}/rechercher-personne?q=...&type=eleve|parent */
    public function rechercherPersonne(Request $request, string $tenantId): JsonResponse
    {
        $request->validate([
            'q'    => 'required|string|min:2',
            'type' => 'required|in:eleve,parent',
        ]);

        $tenant = Tenant::findOrFail($tenantId);
        $q      = '%' . $request->input('q') . '%';

        tenancy()->initialize($tenant);

        $resultats = $request->input('type') === 'parent'
            ? Parents::where('nom_parent', 'like', $q)
                ->orWhere('prenom_parent', 'like', $q)
                ->orWhere('numero_parent', 'like', $q)
                ->limit(20)
                ->get(['id', 'nom_parent', 'prenom_parent', 'numero_parent'])
            : Eleve::where('nom_eleve', 'like', $q)
                ->orWhere('prenoms_eleve', 'like', $q)
                ->orWhere('matricule_eleve', 'like', $q)
                ->limit(20)
                ->get(['id', 'nom_eleve', 'prenoms_eleve', 'matricule_eleve']);

        tenancy()->end();

        return response()->json($resultats);
    }

    /** POST /superadmin/rgpd/tenants/{tenantId}/anonymiser */
    public function anonymiser(Request $request, string $tenantId, AnonymisationService $service): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:eleve,parent',
            'id'   => 'required|integer',
        ]);

        $tenant = Tenant::findOrFail($tenantId);

        tenancy()->initialize($tenant);

        $data['type'] === 'parent'
            ? $service->anonymiserParent((int) $data['id'])
            : $service->anonymiserEleve((int) $data['id']);

        tenancy()->end();

        return response()->json(['message' => 'Données personnelles anonymisées.']);
    }
}
