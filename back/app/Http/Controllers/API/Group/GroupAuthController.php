<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\Group;

use App\Http\Controllers\Controller;
use App\Models\GroupAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class GroupAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $admin = GroupAdmin::with('group')->where('email', $request->email)->first();

        if (!$admin || !Hash::check($request->password, $admin->password)) {
            return response()->json(['message' => 'Identifiants invalides.'], 401);
        }

        if (!$admin->group->actif) {
            return response()->json(['message' => 'Ce groupe est désactivé.'], 403);
        }

        $token = $admin->createToken('group-admin')->plainTextToken;

        return response()->json([
            'token' => $token,
            'admin' => [
                'id'       => $admin->id,
                'nom'      => $admin->nom,
                'email'    => $admin->email,
                'group_id' => $admin->group_id,
                'group'    => $admin->group->nom,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('group'));
    }
}
