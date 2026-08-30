<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupModule;
use App\Models\Module;
use App\Models\Tenant;
use App\Models\TenantModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ModuleController extends Controller
{
    /** Catalogue complet (modules + sous-modules), sans résolution par tenant/groupe. */
    public function index(): JsonResponse
    {
        return response()->json(Module::orderBy('ordre')->get());
    }

    /** Liste légère des groupes, pour le sélecteur du backoffice. */
    public function groupes(): JsonResponse
    {
        return response()->json(Group::orderBy('nom')->get(['id', 'nom']));
    }

    public function pourTenant(string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);

        return response()->json($this->etatResolu(
            TenantModule::where('tenant_id', $tenant->id)->pluck('actif', 'module_id'),
            $tenant->group_id
                ? GroupModule::where('group_id', $tenant->group_id)->pluck('actif', 'module_id')
                : collect()
        ));
    }

    public function pourGroupe(string $groupId): JsonResponse
    {
        $group = Group::findOrFail($groupId);

        return response()->json($this->etatResolu(
            collect(),
            GroupModule::where('group_id', $group->id)->pluck('actif', 'module_id')
        ));
    }

    /**
     * Applique la résolution (tenant > groupe > défaut) au catalogue complet
     * et renvoie, pour chaque module, son état actif et la source de cet état.
     */
    private function etatResolu(Collection $tenantOverrides, Collection $groupOverrides): array
    {
        return Module::orderBy('ordre')->get()->map(function (Module $m) use ($tenantOverrides, $groupOverrides) {
            if ($tenantOverrides->has($m->id)) {
                [$actif, $source] = [(bool) $tenantOverrides[$m->id], 'tenant'];
            } elseif ($groupOverrides->has($m->id)) {
                [$actif, $source] = [(bool) $groupOverrides[$m->id], 'groupe'];
            } else {
                [$actif, $source] = [$m->actif_par_defaut, 'defaut'];
            }

            return [
                'id'        => $m->id,
                'slug'      => $m->slug,
                'label'     => $m->label,
                'parent_id' => $m->parent_id,
                'ordre'     => $m->ordre,
                'actif'     => $actif,
                'source'    => $source,
            ];
        })->values()->all();
    }

    public function updateTenant(Request $request, string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $this->appliquerOverrides($request, fn (int $moduleId, bool $actif) => TenantModule::updateOrCreate(
            ['tenant_id' => $tenant->id, 'module_id' => $moduleId],
            ['actif' => $actif]
        ));

        return response()->json(['message' => 'Modules mis à jour pour cet établissement.']);
    }

    public function updateGroupe(Request $request, string $groupId): JsonResponse
    {
        $group = Group::findOrFail($groupId);
        $this->appliquerOverrides($request, fn (int $moduleId, bool $actif) => GroupModule::updateOrCreate(
            ['group_id' => $group->id, 'module_id' => $moduleId],
            ['actif' => $actif]
        ));

        return response()->json(['message' => 'Modules mis à jour pour ce groupe.']);
    }

    /** @param callable(int, bool): void $sauvegarder */
    private function appliquerOverrides(Request $request, callable $sauvegarder): void
    {
        $overrides = $request->validate(['modules' => 'required|array', 'modules.*' => 'boolean'])['modules'];
        $modulesParSlug = Module::whereIn('slug', array_keys($overrides))->pluck('id', 'slug');

        foreach ($overrides as $slug => $actif) {
            if (!isset($modulesParSlug[$slug])) continue;
            $sauvegarder((int) $modulesParSlug[$slug], (bool) $actif);
        }
    }
}
