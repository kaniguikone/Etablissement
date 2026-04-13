<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Etablissement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EtablissementController extends Controller
{
    /**
     * Retourne les infos de l'établissement (public).
     * GET /etablissement
     */
    public function show()
    {
        return response()->json(Etablissement::firstOrCreate([], ['nom' => 'Mon Établissement']));
    }

    /**
     * Met à jour les infos (protégé — paramétrage).
     * PUT /etablissement
     */
    public function update(Request $request)
    {
        $request->validate([
            'nom'        => 'required|string|max:255',
            'slogan'     => 'nullable|string|max:255',
            'adresse'    => 'nullable|string|max:255',
            'ville'      => 'nullable|string|max:100',
            'bp'         => 'nullable|string|max:100',
            'telephone'  => 'nullable|string|max:30',
            'telephone2' => 'nullable|string|max:30',
            'email'      => 'nullable|email|max:255',
            'site_web'   => 'nullable|string|max:255',
            'pays'       => 'nullable|string|max:100',
        ]);

        $etablissement = Etablissement::firstOrCreate([], ['nom' => 'Mon Établissement']);
        $etablissement->update($request->only([
            'nom', 'slogan', 'adresse', 'ville', 'bp',
            'telephone', 'telephone2', 'email', 'site_web', 'pays',
        ]));

        return response()->json($etablissement->fresh());
    }

    /**
     * Upload du logo.
     * POST /etablissement/logo
     */
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,svg|max:2048',
        ]);

        $etablissement = Etablissement::firstOrCreate([], ['nom' => 'Mon Établissement']);

        // Supprimer l'ancien logo
        if ($etablissement->logo && Storage::disk('public')->exists($etablissement->logo)) {
            Storage::disk('public')->delete($etablissement->logo);
        }

        $path = $request->file('logo')->store('logos', 'public');
        $etablissement->update(['logo' => $path]);

        return response()->json($etablissement->fresh());
    }
}
