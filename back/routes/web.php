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

// ─── App Links Android (vérification propriété du domaine) ───────────────────
// Android consulte ce fichier pour autoriser les deep links vers l'app mobile.
// Remplacer le sha256_cert_fingerprints par l'empreinte du keystore de production.
Route::get('/.well-known/assetlinks.json', function () {
    return response()->json([[
        'relation' => ['delegate_permission/common.handle_all_urls'],
        'target'   => [
            'namespace'               => 'android_app',
            'package_name'            => 'com.example.suivi_scolaire_parent',
            'sha256_cert_fingerprints'=> [
                // TODO : remplacer par l'empreinte réelle du keystore de prod
                // Obtenir avec : keytool -list -v -keystore release.keystore
                'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
            ],
        ],
    ]]);
})->withoutMiddleware(\Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain::class);

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
