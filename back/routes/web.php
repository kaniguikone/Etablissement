<?php

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;
use App\Http\Controllers\TelechargerController;
use App\Http\Controllers\SuperAdminPanelController;

// ─── Page centrale ───────────────────────────────────────────────────────────
Route::get('/', function () {
    return view('welcome');
});

// ─── Panneau super-admin ─────────────────────────────────────────────────────
Route::prefix('superadmin')->group(function () {
    Route::get('/login',  [SuperAdminPanelController::class, 'loginPage']);
    Route::get('/{any}',  [SuperAdminPanelController::class, 'app'])->where('any', '.*');
    Route::get('/',       [SuperAdminPanelController::class, 'app']);
});

// ─── Pages tenant (sous-domaine de l'école) ──────────────────────────────────
Route::middleware([
    InitializeTenancyBySubdomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {
    Route::get('/app',         [TelechargerController::class, 'page']);
    Route::get('/telecharger', [TelechargerController::class, 'page']);
    Route::get('/app/apk',     [TelechargerController::class, 'downloadApk']);
});
