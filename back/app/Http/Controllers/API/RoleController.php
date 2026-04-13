<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index()
    {
        return response()->json(
            Role::withCount('users')->orderBy('label')->get()
        );
    }

    public function permissions()
    {
        return response()->json(
            collect(Role::PERMISSIONS)
                ->map(fn($label, $key) => ['key' => $key, 'label' => $label])
                ->values()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'nom'         => 'required|string|max:60|unique:roles,nom|regex:/^[a-z0-9_]+$/',
            'label'       => 'required|string|max:100',
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in(array_keys(Role::PERMISSIONS))],
            'super'       => 'boolean',
        ]);

        $role = Role::create([
            'nom'         => $request->nom,
            'label'       => $request->label,
            'permissions' => $request->permissions ?? [],
            'super'       => $request->boolean('super', false),
            'actif'       => true,
        ]);

        return response()->json($role, 201);
    }

    public function show(Role $role)
    {
        return response()->json($role->loadCount('users'));
    }

    public function update(Request $request, Role $role)
    {
        $request->validate([
            'label'       => 'sometimes|string|max:100',
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in(array_keys(Role::PERMISSIONS))],
            'super'       => 'boolean',
            'actif'       => 'boolean',
        ]);

        // Empêcher de modifier le nom d'un rôle système
        $role->update($request->only(['label', 'permissions', 'super', 'actif']));

        return response()->json($role->fresh()->loadCount('users'));
    }

    public function destroy(Role $role)
    {
        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer ce rôle : des utilisateurs y sont associés.',
            ], 422);
        }

        $role->delete();
        return response()->json(['message' => 'Rôle supprimé.']);
    }
}
