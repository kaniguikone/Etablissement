<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckGroupPermission
{
    /**
     * Usage dans les routes : middleware('group.permission:budget_validation')
     * Équivalent de CheckRole/'permission:xxx' mais pour un GroupAdmin authentifié
     * (compte central, pas un User tenant) — à poser après 'account.type:App\Models\GroupAdmin'.
     */
    public function handle(Request $request, Closure $next, string ...$permissions): mixed
    {
        $groupAdmin = $request->user();

        if (!empty($permissions) && !$groupAdmin->peutFaire($permissions)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return $next($request);
    }
}
