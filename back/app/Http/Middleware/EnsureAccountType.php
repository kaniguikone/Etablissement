<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAccountType
{
    /**
     * Usage dans les routes : middleware('account.type:App\Models\SuperAdmin')
     * Vérifie que le token Sanctum authentifié appartient bien au modèle attendu,
     * pour empêcher un token "group" d'accéder aux routes "superadmin" (et inversement).
     */
    public function handle(Request $request, Closure $next, string $modelClass): mixed
    {
        $user = $request->user();

        if (!$user || !($user instanceof $modelClass)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return $next($request);
    }
}
