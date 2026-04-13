<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Parents;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ParentAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'numero_parent' => 'required|string',
            'password'      => 'required|string',
        ]);

        $parent = Parents::where('numero_parent', $request->numero_parent)->first();

        if (! $parent || ! Hash::check($request->password, $parent->password)) {
            return response()->json(['message' => 'Numéro ou mot de passe incorrect.'], 401);
        }

        // Révoquer les anciens tokens pour ce parent
        $parent->tokens()->delete();

        $token = $parent->createToken('parent-mobile')->plainTextToken;

        return response()->json([
            'token'  => $token,
            'parent' => [
                'id'             => $parent->id,
                'numero_parent'  => $parent->numero_parent,
                'nom_parent'     => $parent->nom_parent,
                'prenom_parent'  => $parent->prenom_parent,
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
        $parent = $request->user();

        return response()->json([
            'id'            => $parent->id,
            'numero_parent' => $parent->numero_parent,
            'nom_parent'    => $parent->nom_parent,
            'prenom_parent' => $parent->prenom_parent,
        ]);
    }
}
