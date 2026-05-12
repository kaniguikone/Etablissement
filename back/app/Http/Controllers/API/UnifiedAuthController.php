<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Enseignant;
use App\Models\Parents;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UnifiedAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'numero'   => 'required|string',
            'password' => 'required|string',
        ]);

        $numero   = $request->numero;
        $password = $request->password;
        $roles    = [];

        $parent = Parents::where('numero_parent', $numero)->first();
        if ($parent && Hash::check($password, $parent->password)) {
            $parent->tokens()->delete();
            $token          = $parent->createToken('parent-mobile', ['*'], now()->addDays(30))->plainTextToken;
            $roles['parent'] = [
                'token'  => $token,
                'id'     => $parent->id,
                'nom'    => $parent->nom_parent,
                'prenom' => $parent->prenom_parent,
                'numero' => $parent->numero_parent,
            ];
        }

        $enseignant = Enseignant::where('telephone_enseignant', $numero)->first();
        if ($enseignant && Hash::check($password, $enseignant->password)) {
            $enseignant->tokens()->delete();
            $token               = $enseignant->createToken('enseignant-mobile', ['*'], now()->addDays(30))->plainTextToken;
            $roles['enseignant'] = [
                'token'   => $token,
                'id'      => $enseignant->id,
                'nom'     => $enseignant->nom_enseignant,
                'prenoms' => $enseignant->prenoms_enseignant,
                'numero'  => $enseignant->telephone_enseignant,
            ];
        }

        if (empty($roles)) {
            return response()->json(['message' => 'Numéro ou mot de passe incorrect.'], 401);
        }

        return response()->json([
            'roles' => array_keys($roles),
            'data'  => $roles,
        ]);
    }
}
