<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Enseignant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EnseignantAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'numero_enseignant' => 'required|string',
            'password'          => 'required|string',
        ]);

        $enseignant = Enseignant::where('telephone_enseignant', $request->numero_enseignant)->first();

        if (! $enseignant || ! Hash::check($request->password, $enseignant->password)) {
            return response()->json(['message' => 'Numéro ou mot de passe incorrect.'], 401);
        }

        $enseignant->tokens()->delete();
        $token = $enseignant->createToken('enseignant-mobile', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'token'       => $token,
            'enseignant'  => [
                'id'       => $enseignant->id,
                'numero'   => $enseignant->telephone_enseignant,
                'nom'      => $enseignant->nom_enseignant,
                'prenoms'  => $enseignant->prenoms_enseignant,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    public function me(Request $request)
    {
        $e = $request->user();
        return response()->json([
            'id'      => $e->id,
            'numero'  => $e->telephone_enseignant,
            'nom'     => $e->nom_enseignant,
            'prenoms' => $e->prenoms_enseignant,
            'email'   => $e->email_enseignant,
            'tel'     => $e->telephone_enseignant,
            'statut'  => $e->statut_enseignant,
        ]);
    }
}
