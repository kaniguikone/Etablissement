<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\SuperAdmin\SuperAdminAuthController;
use App\Http\Controllers\API\SuperAdmin\TenantController;
use App\Http\Controllers\API\Group\GroupAuthController;
use App\Http\Controllers\API\Group\GroupDashboardController;
use App\Http\Controllers\API\Group\GroupTenantController;
use App\Http\Controllers\API\Group\TemplateController;

/*
|--------------------------------------------------------------------------
| Central API Routes — Super-administration multi-tenant
|--------------------------------------------------------------------------
| Ces routes s'appliquent au domaine central uniquement.
| Elles permettent de gérer les établissements (tenants).
*/

// ─── Auth Group Admin ────────────────────────────────────────────────────────
Route::post('/group/login', [GroupAuthController::class, 'login']);

Route::middleware('auth:sanctum')->prefix('group')->group(function () {
    Route::post('/logout', [GroupAuthController::class, 'logout']);
    Route::get('/me',      [GroupAuthController::class, 'me']);

    // Dashboard consolidé
    Route::get('/dashboard', [GroupDashboardController::class, 'stats']);

    // Gestion des écoles du groupe
    Route::get('/ecoles',                  [GroupTenantController::class, 'index']);
    Route::get('/ecoles/{id}',             [GroupTenantController::class, 'show']);
    Route::get('/ecoles/{id}/stats',       [GroupTenantController::class, 'stats']);
    Route::get('/ecoles/{id}/enseignants/liste',                   [GroupTenantController::class, 'listeEnseignants']);
    Route::get('/ecoles/{id}/enseignants/{enseignantId}/detail',  [GroupTenantController::class, 'profDetail']);
    Route::get('/ecoles/{id}/enseignants',                        [GroupTenantController::class, 'enseignants']);
    Route::get('/ecoles/{id}/eleves/liste',                       [GroupTenantController::class, 'listeEleves']);
    Route::get('/ecoles/{id}/eleves/{eleveId}/detail',            [GroupTenantController::class, 'eleveDetail']);
    Route::get('/ecoles/{id}/eleves',                             [GroupTenantController::class, 'eleves']);

    // Templates de données scolaires
    Route::get('/templates',                                      [TemplateController::class, 'index']);
    Route::get('/templates/{type}',                               [TemplateController::class, 'show']);
    Route::put('/templates/{type}',                               [TemplateController::class, 'update']);
    Route::post('/ecoles/{tenantId}/apply-template',              [TemplateController::class, 'appliquer']);
});

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
