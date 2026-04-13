<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTenantActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = tenant();

        if (!$tenant) {
            return $next($request);
        }

        // Établissement désactivé manuellement
        if (!$tenant->actif) {
            return response()->json([
                'message' => 'Cet établissement est temporairement suspendu. Contactez le support.',
                'code'    => 'TENANT_INACTIVE',
            ], 403);
        }

        // Abonnement expiré
        if ($tenant->date_expiration && $tenant->date_expiration->isPast()) {
            return response()->json([
                'message' => 'L\'abonnement de cet établissement a expiré. Contactez le support pour le renouveler.',
                'code'    => 'TENANT_EXPIRED',
                'expired_at' => $tenant->date_expiration->toDateString(),
            ], 403);
        }

        return $next($request);
    }
}
