<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleActive
{
    /**
     * Usage dans les routes : middleware('module:eleves')
     * ou : middleware('module:finances_caisse,finances_gestion')  (au moins un module actif)
     */
    public function handle(Request $request, Closure $next, string ...$slugs): Response
    {
        $tenant = tenant();

        if (!$tenant || empty($slugs)) {
            return $next($request);
        }

        $actifs = $tenant->modulesActifs();
        if ($actifs === null) {
            return $next($request);
        }

        $autorise = collect($slugs)->contains(fn (string $slug) => in_array($slug, $actifs, true));

        if (!$autorise) {
            return response()->json([
                'message' => "Ce module n'est pas inclus dans l'abonnement de cet établissement.",
                'code'    => 'MODULE_INACTIF',
            ], 403);
        }

        return $next($request);
    }
}
