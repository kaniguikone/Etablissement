<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ConfigSaas;
use App\Models\TarifLicence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TarifsLicenceController extends Controller
{
    /** GET /tarifs — public, pour la landing page. */
    public function public(): JsonResponse
    {
        $tranches = TarifLicence::where('actif', true)->orderBy('ordre')->get();
        $config   = ConfigSaas::whereIn('cle', ['plancher_minimum', 'devise', 'taux_tva', 'tarif_acces_parent'])->pluck('valeur', 'cle');

        return response()->json([
            'tranches' => $tranches,
            'config'   => $config,
        ]);
    }

    /** GET /superadmin/tarifs */
    public function index(): JsonResponse
    {
        return response()->json([
            'tranches' => TarifLicence::orderBy('ordre')->get(),
            'config'   => ConfigSaas::all()->pluck('valeur', 'cle'),
        ]);
    }

    /** POST /superadmin/tarifs/tranches */
    public function storeTranche(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tranche_min'    => 'required|integer|min:1',
            'tranche_max'    => 'nullable|integer|gt:tranche_min',
            'prix_par_eleve' => 'required|integer|min:1',
            'ordre'          => 'required|integer|min:0',
        ]);

        $tranche = TarifLicence::create([...$data, 'actif' => true]);
        $this->reordonner();

        return response()->json($tranche, 201);
    }

    /** PUT /superadmin/tarifs/tranches/{id} */
    public function updateTranche(Request $request, int $id): JsonResponse
    {
        $tranche = TarifLicence::findOrFail($id);

        $data = $request->validate([
            'tranche_min'    => 'sometimes|integer|min:1',
            'tranche_max'    => 'nullable|integer',
            'prix_par_eleve' => 'sometimes|integer|min:1',
            'ordre'          => 'sometimes|integer|min:0',
            'actif'          => 'sometimes|boolean',
        ]);

        $tranche->update($data);
        $this->reordonner();

        return response()->json($tranche->fresh());
    }

    /** DELETE /superadmin/tarifs/tranches/{id} */
    public function destroyTranche(int $id): JsonResponse
    {
        TarifLicence::findOrFail($id)->delete();
        $this->reordonner();

        return response()->json(['message' => 'Tranche supprimée.']);
    }

    /** PUT /superadmin/tarifs/config */
    public function updateConfig(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plancher_minimum'   => 'sometimes|integer|min:0',
            'duree_demo_jours'   => 'sometimes|integer|min:1',
            'taux_tva'           => 'sometimes|numeric|min:0|max:100',
            'tarif_acces_parent' => 'sometimes|integer|min:0',
        ]);

        foreach ($data as $cle => $valeur) {
            ConfigSaas::definir($cle, (string) $valeur);
        }

        return response()->json(['message' => 'Configuration enregistrée.']);
    }

    /** POST /superadmin/tarifs/simuler */
    public function simuler(Request $request): JsonResponse
    {
        $request->validate(['effectif' => 'required|integer|min:1']);
        return response()->json(TarifLicence::calculer($request->integer('effectif')));
    }

    /** Recalcule l'ordre après chaque modification pour garder les tranches cohérentes. */
    private function reordonner(): void
    {
        TarifLicence::orderBy('tranche_min')
            ->get()
            ->each(fn($t, $i) => $t->update(['ordre' => $i + 1]));
    }
}
