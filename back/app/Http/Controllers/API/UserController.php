<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(
            User::with('role')
                ->select('id', 'name', 'telephone', 'email', 'role_id', 'actif', 'created_at')
                ->orderBy('name')
                ->get()
                ->map(fn($u) => [
                    'id'         => $u->id,
                    'name'       => $u->name,
                    'telephone'  => $u->telephone,
                    'email'      => $u->email,
                    'photo_url'  => $u->photo_url,
                    'role_id'    => $u->role_id,
                    'role_label' => $u->role?->label ?? '—',
                    'actif'      => $u->actif,
                    'created_at' => $u->created_at,
                ])
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'telephone' => 'nullable|string|max:30',
            'email'     => 'required|email|unique:users,email',
            'role_id'   => 'required|exists:roles,id',
            'password'  => 'required|string|min:6',
        ]);

        $user = User::create([
            'name'      => $request->name,
            'telephone' => $request->telephone,
            'email'     => $request->email,
            'role_id'   => $request->role_id,
            'actif'     => true,
            'password'  => Hash::make($request->password),
        ]);

        return response()->json($user->load('role'), 201);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name'      => 'sometimes|string|max:255',
            'telephone' => 'nullable|string|max:30',
            'email'     => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'role_id'   => 'sometimes|exists:roles,id',
            'actif'     => 'sometimes|boolean',
            'password'  => 'nullable|string|min:6',
        ]);

        $data = $request->only(['name', 'telephone', 'email', 'role_id', 'actif']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json($user->fresh()->load('role'));
    }

    public function destroy(User $user)
    {
        $user->update(['actif' => false]);
        return response()->json(['message' => 'Utilisateur désactivé.']);
    }

    public function monProfil(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'name'            => 'sometimes|string|max:255',
            'telephone'       => 'nullable|string|max:30',
            'password_actuel' => 'required_with:password|string',
            'password'        => 'nullable|string|min:6',
        ]);

        if ($request->filled('password')) {
            if (!Hash::check($request->password_actuel, $user->password)) {
                return response()->json(['message' => 'Mot de passe actuel incorrect.'], 422);
            }
        }

        $data = $request->only(['name', 'telephone']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);
        $user->load('role');

        return response()->json([
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'telephone'   => $user->telephone,
            'photo_url'   => $user->photo_url,
            'role_id'     => $user->role_id,
            'role_label'  => $user->role?->label ?? '—',
            'permissions' => $user->role?->permissions ?? [],
            'super'       => $user->estSuperAdmin(),
        ]);
    }

    // L'utilisateur connecté change sa propre photo (MonProfil)
    public function updateMaPhoto(Request $request)
    {
        $request->validate(['photo' => 'required|image|max:2048']);
        $user = $request->user();

        if ($user->photo) {
            Storage::disk('public')->delete($user->photo);
        }

        $path = $request->file('photo')->store('photos/users', 'public');
        $user->update(['photo' => $path]);

        return response()->json(['photo_url' => $user->photo_url]);
    }

    // L'admin change la photo d'un autre utilisateur
    public function updatePhoto(Request $request, User $user)
    {
        $request->validate(['photo' => 'required|image|max:2048']);

        if ($user->photo) {
            Storage::disk('public')->delete($user->photo);
        }

        $path = $request->file('photo')->store('photos/users', 'public');
        $user->update(['photo' => $path]);

        return response()->json(['photo_url' => $user->photo_url]);
    }
}
