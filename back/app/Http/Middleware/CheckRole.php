<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * Usage dans les routes : middleware('permission:finances')
     * ou : middleware('permission:finances,pedagogie')  (l'utilisateur doit avoir AU MOINS UNE)
     */
    public function handle(Request $request, Closure $next, string ...$permissions): mixed
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        if (!$user->actif) {
            return response()->json(['message' => 'Compte désactivé.'], 403);
        }

        // Rôle super → accès total
        if ($user->estSuperAdmin()) {
            return $next($request);
        }

        // Vérification des permissions requises
        if (!empty($permissions) && !$user->peutFaire($permissions)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return $next($request);
    }
}
