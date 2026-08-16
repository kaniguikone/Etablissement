<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\SanteEleve;
use Illuminate\Http\Request;

class SanteEleveController extends Controller
{
    /**
     * Fiche santé d'un élève (peut ne pas encore exister).
     */
    public function show(string $eleveId)
    {
        $eleve = Eleve::with('classe.niveau')->findOrFail($eleveId);
        $sante = SanteEleve::where('eleve_id', $eleveId)->first();

        return response()->json(compact('eleve', 'sante'));
    }

    public function update(Request $request, string $eleveId)
    {
        Eleve::findOrFail($eleveId);

        $data = $request->validate([
            'groupe_sanguin'             => 'nullable|string|max:10',
            'allergies'                  => 'nullable|string',
            'medecin_nom'                => 'nullable|string|max:150',
            'medecin_telephone'          => 'nullable|string|max:30',
            'contact_urgence_nom'        => 'nullable|string|max:150',
            'contact_urgence_lien'       => 'nullable|string|max:50',
            'contact_urgence_telephone'  => 'nullable|string|max:30',
            'assurance_compagnie'        => 'nullable|string|max:150',
            'assurance_numero_police'    => 'nullable|string|max:100',
        ]);

        $sante = SanteEleve::updateOrCreate(['eleve_id' => $eleveId], $data);

        return response()->json($sante);
    }
}
