<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\DemandeAccesController;
use App\Http\Controllers\API\ParentCentralController;
use App\Http\Controllers\API\SuperAdmin\SuperAdminAuthController;
use App\Http\Controllers\API\SuperAdmin\TarifsLicenceController;
use App\Http\Controllers\API\SuperAdmin\TenantController;
use App\Http\Controllers\API\SuperAdmin\AbonnementSaasController;
use App\Http\Controllers\API\Group\GroupAuthController;
use App\Http\Controllers\API\Group\GroupDashboardController;
use App\Http\Controllers\API\Group\GroupTenantController;
use App\Http\Controllers\API\Group\TemplateController;
use App\Http\Controllers\API\SuperAdmin\SuperAdminTemplateController;
use App\Http\Controllers\API\SeederController;

/*
|--------------------------------------------------------------------------
| Central API Routes — Super-administration multi-tenant
|--------------------------------------------------------------------------
| Ces routes s'appliquent au domaine central uniquement.
| Elles permettent de gérer les établissements (tenants).
*/

// ─── Tarifs publics (landing page) ───────────────────────────────────────────
Route::get('/tarifs', [TarifsLicenceController::class, 'public']);

// ─── Demande d'accès établissement (formulaire public) ───────────────────────
Route::post('/demande-acces', [DemandeAccesController::class, 'store']);

// ─── Portail parent central (cross-tenant) ────────────────────────────────────
Route::post('/parent/login',            [ParentCentralController::class, 'login']);
Route::get('/parent/valider-matricule', [ParentCentralController::class, 'validerMatricule']);
Route::post('/parent/inscription',      [ParentCentralController::class, 'inscrire']);

// ─── Recherche publique d'établissements (onboarding mobile) ─────────────────
Route::get('/etablissements/recherche',   [TenantController::class, 'recherche']);
Route::get('/etablissements/code/{code}', [TenantController::class, 'lookupParCode']);

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

    // ── Demandes d'accès ─────────────────────────────────────────────────────
    Route::get('/demandes',                         [DemandeAccesController::class, 'index']);
    Route::post('/demandes/{id}/accepter',          [DemandeAccesController::class, 'accepter']);
    Route::post('/demandes/{id}/refuser',           [DemandeAccesController::class, 'refuser']);

    // ── Tarifs & configuration licence ───────────────────────────────────────
    Route::get('/tarifs',                           [TarifsLicenceController::class, 'index']);
    Route::post('/tarifs/tranches',                 [TarifsLicenceController::class, 'storeTranche']);
    Route::put('/tarifs/tranches/{id}',             [TarifsLicenceController::class, 'updateTranche']);
    Route::delete('/tarifs/tranches/{id}',          [TarifsLicenceController::class, 'destroyTranche']);
    Route::put('/tarifs/config',                    [TarifsLicenceController::class, 'updateConfig']);
    Route::post('/tarifs/simuler',                  [TarifsLicenceController::class, 'simuler']);

    Route::get('/tenants',                      [TenantController::class, 'index']);
    Route::post('/tenants',                     [TenantController::class, 'store']);
    Route::get('/tenants/{id}',                 [TenantController::class, 'show']);
    Route::put('/tenants/{id}',                 [TenantController::class, 'update']);
    Route::delete('/tenants/{id}',              [TenantController::class, 'destroy']);
    Route::post('/tenants/{id}/toggle-actif',   [TenantController::class, 'toggleActif']);
    Route::post('/tenants/{id}/apk',            [TenantController::class, 'uploadApk']);
    Route::delete('/tenants/{id}/apk',          [TenantController::class, 'deleteApk']);

    // ── Billing / Abonnements SaaS ────────────────────────────────────────
    Route::get('/billing',                           [AbonnementSaasController::class, 'index']);
    Route::get('/billing/plans',                     [AbonnementSaasController::class, 'plans']);
    Route::post('/billing/abonnements',              [AbonnementSaasController::class, 'store']);
    Route::get('/billing/tenants/{tenantId}/historique', [AbonnementSaasController::class, 'historique']);
    Route::get('/billing/factures/{id}/telecharger', [AbonnementSaasController::class, 'telechargerFacture']);
    Route::post('/billing/factures/{id}/payer',      [AbonnementSaasController::class, 'marquerPayee']);

    // ── Templates de type d'établissement ────────────────────────────────────
    Route::get('/templates',                         [TemplateController::class, 'index']);
    Route::get('/templates/{type}',                  [TemplateController::class, 'show']);
    Route::put('/templates/{type}',                  [TemplateController::class, 'update']);
    Route::post('/tenants/{tenantId}/apply-template',[TemplateController::class, 'appliquer']);

    // ── Seed (dev) ────────────────────────────────────────────────────────────
    Route::post('/seeder/lancer',               [SeederController::class, 'lancerCentral']);
    Route::get('/seeder/status/{jobId}',        [SeederController::class, 'statutCentral']);
});
