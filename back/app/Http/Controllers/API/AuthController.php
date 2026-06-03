<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with('role')->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Identifiants invalides.'], 401);
        }

        if (!$user->actif) {
            return response()->json(['message' => 'Ce compte est désactivé. Contactez l\'administrateur.'], 403);
        }

        $token = $user->createToken('backoffice', ['*'], now()->addHours(8))->plainTextToken;

        $tenant = tenant();

        return response()->json([
            'token'                => $token,
            'user'                 => $this->formatUser($user),
            'group_id'             => $tenant?->group_id,
            'group_nom'            => $tenant?->group?->nom,
            'must_change_password' => (bool) $user->must_change_password,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request)
    {
        return response()->json($this->formatUser($request->user()->load('role')));
    }

    private function formatUser(User $user): array
    {
        return [
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'telephone'      => $user->telephone,
            'photo_url'      => $user->photo_url,
            'role_id'        => $user->role_id,
            'role_label'     => $user->role?->label ?? '—',
            'permissions'    => $user->role?->permissions ?? [],
            'super'          => $user->estSuperAdmin(),
        ];
    }
}
