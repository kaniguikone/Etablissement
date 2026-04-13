<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\SuperAdmin\SuperAdminAuthController;
use App\Http\Controllers\API\SuperAdmin\TenantController;

/*
|--------------------------------------------------------------------------
| Central API Routes — Super-administration multi-tenant
|--------------------------------------------------------------------------
| Ces routes s'appliquent au domaine central uniquement.
| Elles permettent de gérer les établissements (tenants).
*/

// ─── Auth Super-Admin ────────────────────────────────────────────────────────
Route::post('/superadmin/login', [SuperAdminAuthController::class, 'login']);

// ─── Gestion des tenants (établissements) ────────────────────────────────────
Route::middleware('auth:sanctum')->prefix('superadmin')->group(function () {
    Route::post('/logout',    [SuperAdminAuthController::class, 'logout']);
    Route::get('/me',         [SuperAdminAuthController::class, 'me']);

    Route::get('/tenants',                      [TenantController::class, 'index']);
    Route::post('/tenants',                     [TenantController::class, 'store']);
    Route::get('/tenants/{id}',                 [TenantController::class, 'show']);
    Route::put('/tenants/{id}',                 [TenantController::class, 'update']);
    Route::delete('/tenants/{id}',              [TenantController::class, 'destroy']);
    Route::post('/tenants/{id}/toggle-actif',   [TenantController::class, 'toggleActif']);
    Route::post('/tenants/{id}/apk',            [TenantController::class, 'uploadApk']);
    Route::delete('/tenants/{id}/apk',          [TenantController::class, 'deleteApk']);
});
