<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\RoleController;
use App\Http\Controllers\API\EleveController;
use App\Http\Controllers\API\ClasseController;
use App\Http\Controllers\API\NiveauController;
use App\Http\Controllers\API\MatiereController;
use App\Http\Controllers\API\PeriodeController;
use App\Http\Controllers\API\ScolariteController;
use App\Http\Controllers\API\EnseignantController;
use App\Http\Controllers\API\InformationsController;
use App\Http\Controllers\API\ParentController;
use App\Http\Controllers\API\AssiduitesController;
use App\Http\Controllers\API\TypeDevoirController;
use App\Http\Controllers\API\DevoirController;
use App\Http\Controllers\API\NoteController;
use App\Http\Controllers\API\ParentAuthController;
use App\Http\Controllers\API\ParentPortalController;
use App\Http\Controllers\API\EnseignantAuthController;
use App\Http\Controllers\API\EnseignantPortalController;
use App\Http\Controllers\API\EmploiDuTempsController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\PaiementController;
use App\Http\Controllers\API\BulletinPdfController;
use App\Http\Controllers\API\AttestationPdfController;
use App\Http\Controllers\API\CinetPayController;
use App\Http\Controllers\API\InscriptionController;
use App\Http\Controllers\API\StatistiquesController;
use App\Http\Controllers\API\ChapitreMatiereController;
use App\Http\Controllers\API\EtablissementController;
use App\Http\Controllers\API\VolumeHoraireController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\ArchivageController;
use App\Http\Controllers\API\CalendrierController;
use App\Http\Controllers\API\SanctionController;
use App\Http\Controllers\API\SalleController;
use App\Http\Controllers\API\RemplacementController;
use App\Http\Controllers\API\MessageController;
use App\Http\Controllers\API\RdvController;
use App\Http\Controllers\API\ConfigurationMatieresController;
use App\Http\Controllers\API\ExportMoyennesController;
use App\Http\Controllers\API\SelfTemplateController;
use App\Http\Controllers\API\ImportEleveController;
use App\Http\Controllers\API\ImportEnseignantController;
use App\Http\Controllers\API\ImportScolariteController;
use App\Http\Controllers\API\ImportAffectationController;
use App\Http\Controllers\API\ImportNoteController;
use App\Http\Controllers\API\SeederController;
use App\Http\Controllers\API\AppreciationController;
use App\Http\Controllers\API\MotDePasseController;
use App\Http\Controllers\API\ReleveAnnuelController;
use App\Http\Controllers\API\UnifiedAuthController;

/*
|--------------------------------------------------------------------------
| Tenant Routes — chargées uniquement pour les domaines tenant
|--------------------------------------------------------------------------
| Ces routes sont injectées sous le préfixe /api avec le middleware 'api'
| par TenancyServiceProvider::mapRoutes().
| Le middleware InitializeTenancyByDomain/Subdomain est appliqué ici.
*/

Route::middleware([
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
    'tenant.active',
])->group(function () {

    // ─── Auth back-office ────────────────────────────────────────────────────
    Route::post('/login',  [AuthController::class, 'login']);

    // ─── Auth mobile unifiée (parent + enseignant en un seul appel) ──────────
    Route::post('/mobile/login', [UnifiedAuthController::class, 'login']);

    // ─── Mot de passe oublié (public) ────────────────────────────────────────
    Route::post('/mot-de-passe/oublie',       [MotDePasseController::class, 'oublie']);
    Route::post('/mot-de-passe/reinitialiser', [MotDePasseController::class, 'reinitialiser']);

    // ─── Images ──────────────────────────────────────────────────────────────
    Route::get('/image/{path}', function (string $path) {
        $normalized = preg_replace('/\.\.\/|\.\.\\\\/', '', $path);
        $fullPath   = storage_path('app/public/' . $normalized);
        if (!file_exists($fullPath)) abort(404);
        return response()->file($fullPath, ['Cache-Control' => 'public, max-age=86400']);
    })->where('path', '.*');

    // ─── Fichiers publics du stockage tenant (logos, etc.) ──────────────────
    Route::get('/public-storage/{path}', function (string $path) {
        $normalized = preg_replace('/\.\.\/|\.\.\\\\/', '', $path);
        $fullPath   = storage_path('app/public/' . $normalized);
        if (!file_exists($fullPath)) abort(404);
        return response()->file($fullPath, ['Cache-Control' => 'public, max-age=86400']);
    })->where('path', '.*');

    // ─── Établissement (public — apps mobiles avant login) ──────────────────
    Route::get('/etablissement', [EtablissementController::class, 'show']);

    // ─── Inscription parent (public) ─────────────────────────────────────────
    Route::post('/inscription',               [InscriptionController::class, 'soumettre']);
    Route::get('/inscription/{token}/statut', [InscriptionController::class, 'statut']);

    // ─── CinetPay webhook (public) ───────────────────────────────────────────
    Route::post('/paiements/notify', [CinetPayController::class, 'notify']);

    // ─── Portail Enseignant (mobile + web) ──────────────────────────────────
    // auth:sanctum résout Enseignant (token mobile) ou User (token web avec enseignant_id)
    Route::post('/enseignant/login', [EnseignantAuthController::class, 'login']);
    Route::middleware('auth:sanctum')->prefix('enseignant')->group(function () {
        Route::get('/notifications',                [NotificationController::class, 'index']);
        Route::get('/notifications/non-lues',       [NotificationController::class, 'nonLues']);
        Route::post('/notifications/{id}/lire',     [NotificationController::class, 'lire']);
        Route::post('/notifications/lire-tout',     [NotificationController::class, 'lireTout']);
        Route::delete('/notifications/{id}',        [NotificationController::class, 'destroy']);
        Route::post('/fcm-token',                   [NotificationController::class, 'enregistrerToken']);
        Route::post('/logout',                [EnseignantAuthController::class,  'logout']);
        Route::get('/me',                     [EnseignantAuthController::class,  'me']);
        Route::get('/classes',                [EnseignantPortalController::class, 'classes']);
        Route::get('/classe/{id}/eleves',     [EnseignantPortalController::class, 'eleves']);
        Route::get('/devoirs',                [EnseignantPortalController::class, 'devoirs']);
        Route::post('/devoirs',               [EnseignantPortalController::class, 'creerDevoir']);
        Route::put('/devoirs/{id}',           [EnseignantPortalController::class, 'modifierDevoir']);
        Route::get('/devoir/{id}/notes',                [EnseignantPortalController::class, 'notes']);
        Route::post('/devoir/{id}/notes',               [EnseignantPortalController::class, 'sauvegarderNotes']);
        Route::get('/devoir/{id}/import/template',      [ImportNoteController::class, 'template']);
        Route::post('/devoir/{id}/import',              [ImportNoteController::class, 'import']);
        Route::get('/assiduites',             [EnseignantPortalController::class, 'feuillePresence']);
        Route::post('/assiduites',            [EnseignantPortalController::class, 'sauvegarderPresences']);
        Route::get('/emploi',                 [EnseignantPortalController::class, 'emploiDuTemps']);
        Route::get('/periodes',               [EnseignantPortalController::class, 'periodes']);
        Route::get('/periodes/parDate',       [PeriodeController::class,          'parDate']);
        Route::get('/typeDevoirs',            [EnseignantPortalController::class, 'typeDevoirs']);
        Route::get('/devoirs/prochainCode',   [DevoirController::class, 'prochainCode']);
        Route::get('/informations',           [EnseignantPortalController::class, 'informations']);
        Route::get('/progression',            [EnseignantPortalController::class, 'progression']);
        Route::post('/progression',           [EnseignantPortalController::class, 'sauvegarderProgression']);
        Route::delete('/progression/{id}',    [EnseignantPortalController::class, 'supprimerProgression']);
        Route::get('/remplacements',          [RemplacementController::class, 'mesRemplacements']);
        Route::get('/messages/conversations', [MessageController::class, 'conversations']);
        Route::get('/messages/eleve/{eleveId}',[MessageController::class, 'fil']);
        Route::post('/messages',              [MessageController::class, 'store']);
        Route::post('/messages/lire-tout',    [MessageController::class, 'lireTout']);
        Route::get('/rdv/creneaux',           [RdvController::class, 'mesCreneaux']);
        Route::post('/rdv/creneaux',          [RdvController::class, 'creerCreneau']);
        Route::delete('/rdv/creneaux/{id}',   [RdvController::class, 'supprimerCreneau']);
        Route::get('/rdv/reservations',       [RdvController::class, 'mesReservations']);
        Route::post('/rdv/reservations/{id}/confirmer', [RdvController::class, 'confirmer']);
        Route::post('/rdv/reservations/{id}/annuler',   [RdvController::class, 'annulerEnseignant']);

        // Appréciations (l'enseignant peut saisir et consulter ses propres appréciations)
        Route::get('/appreciations-matiere/{classeId}/{periodeId}', [AppreciationController::class, 'parClasse']);
        Route::post('/appreciations-matiere/batch',                  [AppreciationController::class, 'sauvegarderBatch']);
    });

    // ─── Portail Parent (mobile) ─────────────────────────────────────────────
    Route::post('/parent/login', [ParentAuthController::class, 'login']);
    Route::middleware('auth:sanctum')->prefix('parent')->group(function () {
        Route::get('/notifications',                [NotificationController::class, 'index']);
        Route::get('/notifications/non-lues',       [NotificationController::class, 'nonLues']);
        Route::post('/notifications/{id}/lire',     [NotificationController::class, 'lire']);
        Route::post('/notifications/lire-tout',     [NotificationController::class, 'lireTout']);
        Route::delete('/notifications/{id}',        [NotificationController::class, 'destroy']);
        Route::post('/fcm-token',                   [NotificationController::class, 'enregistrerToken']);
        Route::post('/logout',                               [ParentAuthController::class,  'logout']);
        Route::get('/me',                                    [ParentAuthController::class,  'me']);
        Route::get('/enfants',                               [ParentPortalController::class, 'enfants']);
        Route::get('/enfant/{id}/bulletin/{periodeId}',      [ParentPortalController::class, 'bulletin']);
        Route::get('/enfant/{id}/bulletin/{periodeId}/pdf',  [ParentPortalController::class, 'bulletinPdf']);
        Route::get('/enfant/{id}/assiduites/{periodeId}',    [ParentPortalController::class, 'assiduites']);
        Route::get('/enfant/{id}/scolarites',                [ParentPortalController::class, 'scolarites']);
        Route::get('/enfant/{id}/enseignants',               [ParentPortalController::class, 'enseignants']);
        Route::get('/informations',                          [ParentPortalController::class, 'informations']);
        Route::get('/enfant/{id}/emploi',                    [ParentPortalController::class, 'emploiDuTemps']);
        Route::get('/enfant/{id}/paiements',                 [ParentPortalController::class, 'paiements']);
        Route::get('/paiements/{id}/recu',                   [ParentPortalController::class, 'recuPdf']);
        Route::get('/messages/conversations',                [MessageController::class, 'conversations']);
        Route::get('/messages/eleve/{eleveId}',              [MessageController::class, 'fil']);
        Route::post('/messages',                             [MessageController::class, 'store']);
        Route::post('/messages/lire-tout',                   [MessageController::class, 'lireTout']);
        Route::get('/rdv/enseignant/{enseignantId}/creneaux',[RdvController::class, 'creneauxEnseignant']);
        Route::post('/rdv/reserver',                         [RdvController::class, 'reserver']);
        Route::get('/rdv/reservations',                      [RdvController::class, 'mesReservationsParent']);
        Route::delete('/rdv/reservations/{id}',              [RdvController::class, 'annulerParent']);
        Route::get('/annees-scolaires',                      [ArchivageController::class, 'index']);
        Route::get('/periodes-annee/{anneeId}',              function (int $anneeId) {
            return response()->json(\App\Models\Periodes::where('annee_scolaire_id', $anneeId)->get());
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── Back-office (authentification requise) ───────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
        Route::put('/mon-profil',        [UserController::class, 'monProfil']);
        Route::post('/mon-profil/photo', [UserController::class, 'updateMaPhoto']);

        Route::get('/notifications',                [NotificationController::class, 'index']);
        Route::get('/notifications/non-lues',       [NotificationController::class, 'nonLues']);
        Route::post('/notifications/{id}/lire',     [NotificationController::class, 'lire']);
        Route::post('/notifications/lire-tout',     [NotificationController::class, 'lireTout']);
        Route::delete('/notifications/{id}',        [NotificationController::class, 'destroy']);
        Route::post('/fcm-token',                   [NotificationController::class, 'enregistrerToken']);

        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

        Route::middleware('permission:pedagogie_saisie,pedagogie_pilotage,finances_caisse,finances_gestion')->group(function () {
            Route::get('/stats/synthese',     [StatistiquesController::class, 'synthese']);
            Route::get('/stats/presences',    [StatistiquesController::class, 'presences']);
            Route::get('/stats/moyennes',     [StatistiquesController::class, 'moyennes']);
            Route::get('/stats/finances',     [StatistiquesController::class, 'finances']);
            Route::get('/stats/evolution',    [StatistiquesController::class, 'evolution']);
            Route::get('/stats/classement',   [StatistiquesController::class, 'classement']);
            Route::get('/stats/enseignants',  [StatistiquesController::class, 'enseignants']);
        });

        Route::middleware('permission:finances_caisse,finances_gestion')->group(function () {
            Route::get('/echeancier', [PaiementController::class, 'echeancier']);
        });

        Route::get('/annees-scolaires-public', [ArchivageController::class, 'index']);

        Route::get('/niveaux',      [NiveauController::class, 'index']);
        Route::get('/niveaux/{id}', [NiveauController::class, 'show']);
        Route::get('/matieres',              [MatiereController::class,   'index']);
        Route::get('/typeDevoirs',           [TypeDevoirController::class,'index']);
        Route::get('/periodes',              [PeriodeController::class,   'index']);
        Route::get('/periodes/parDate',      [PeriodeController::class,   'parDate']);
        Route::get('/classesTout',           [ClasseController::class,    'listeclasses']);
        Route::get('/classesNiveaux/{id}',   [ClasseController::class,    'ChoixNiveau']);
        Route::get('/niveauClasse/{id}',     [ClasseController::class,    'niveauClasse']);
        Route::get('/classeEnseignants/{id}',[ClasseController::class,    'ClasseEnseignant']);
        Route::get('/classeMatieresEnseignants/{id}',            [ClasseController::class, 'classeMatieresEnseignants']);
        Route::get('/matiereEnseignants/{id}',                   [ClasseController::class, 'enseignantsParMatiere']);
        Route::get('/profsParMatieres',                          [ClasseController::class, 'profsParMatieres']);
        Route::post('/classes/{id}/affectations',                [ClasseController::class, 'ajouterAffectation']);
        Route::delete('/classes/{classeId}/affectations/{affId}',[ClasseController::class, 'supprimerAffectation']);
        Route::get('/classes',               [ClasseController::class,    'index']);
        Route::get('/classes/{id}',          [ClasseController::class,    'show']);

        Route::get('/salles', [SalleController::class, 'index']);
        Route::middleware('permission:parametrage')->group(function () {
            Route::post('/salles',              [SalleController::class, 'store']);
            Route::get('/salles/{id}',          [SalleController::class, 'show']);
            Route::put('/salles/{id}',          [SalleController::class, 'update']);
            Route::delete('/salles/{id}',       [SalleController::class, 'destroy']);
            Route::get('/salles/{id}/planning', [SalleController::class, 'planning']);
        });

        // ─── Démarrage rapide — établissements indépendants ──────────────────
        Route::get('/templates',              [SelfTemplateController::class, 'index']);
        Route::post('/self/apply-template',   [SelfTemplateController::class, 'appliquer']);

        Route::middleware('permission:parametrage')->group(function () {
            Route::put('/etablissement',        [EtablissementController::class, 'update']);
            Route::post('/etablissement/logo',  [EtablissementController::class, 'uploadLogo']);

            Route::get('/volumesHoraires/{niveau_id}',   [VolumeHoraireController::class, 'parNiveau'])->where('niveau_id', '[0-9]+');
            Route::post('/volumesHoraires',              [VolumeHoraireController::class, 'store']);
            Route::put('/volumesHoraires/{id}',          [VolumeHoraireController::class, 'update'])->where('id', '[0-9]+');
            Route::delete('/volumesHoraires/{id}',       [VolumeHoraireController::class, 'destroy'])->where('id', '[0-9]+');

            // Configuration matières / niveaux / classes
            Route::get('/config-matieres',                          [ConfigurationMatieresController::class, 'index']);
            Route::post('/config-matieres/etablissement',           [ConfigurationMatieresController::class, 'saveEtablissement']);
            Route::post('/config-matieres/series',                  [ConfigurationMatieresController::class, 'storeSerie']);
            Route::put('/config-matieres/series/{id}',              [ConfigurationMatieresController::class, 'updateSerie']);
            Route::delete('/config-matieres/series/{id}',           [ConfigurationMatieresController::class, 'destroySerie']);
            Route::post('/config-matieres/groupes',                 [ConfigurationMatieresController::class, 'storeGroupe']);
            Route::put('/config-matieres/groupes/{id}',             [ConfigurationMatieresController::class, 'updateGroupe']);
            Route::delete('/config-matieres/groupes/{id}',          [ConfigurationMatieresController::class, 'destroyGroupe']);
            Route::post('/config-matieres/niveaux/{id}',            [ConfigurationMatieresController::class, 'saveNiveau']);
            Route::post('/config-matieres/classes/{id}',            [ConfigurationMatieresController::class, 'saveClasse']);

            Route::post('/niveaux',          [NiveauController::class, 'store']);
            Route::put('/niveaux/{id}',      [NiveauController::class, 'update']);
            Route::delete('/niveaux/{id}',   [NiveauController::class, 'destroy']);
            Route::apiResource('matieres',    MatiereController::class)->except(['index']);
            Route::apiResource('typeDevoirs', TypeDevoirController::class)->except(['index']);
            Route::apiResource('periodes',    PeriodeController::class)->except(['index']);
            Route::put('/classes/{id}',    [ClasseController::class, 'update']);
            Route::delete('/classes/{id}', [ClasseController::class, 'destroy']);
            Route::post('/classes',        [ClasseController::class, 'store']);
        });

        Route::middleware('permission:inscriptions')->group(function () {
            Route::get('/inscriptions',               [InscriptionController::class, 'index']);
            Route::get('/inscriptions/{id}',          [InscriptionController::class, 'show']);
            Route::post('/inscriptions/directe',      [InscriptionController::class, 'directe']);
            Route::post('/inscriptions/{id}/valider', [InscriptionController::class, 'valider']);
            Route::post('/inscriptions/{id}/rejeter', [InscriptionController::class, 'rejeter']);
        });

        Route::middleware('permission:eleves')->group(function () {
            Route::get('/eleves/export',           [EleveController::class, 'exportCsv']);
            Route::get('/eleves/import/template',  [ImportEleveController::class, 'template']);
            Route::post('/eleves/import',          [ImportEleveController::class, 'import']);
            Route::get('/elevesTout',              [EleveController::class, 'listeEleves']);
            Route::apiResource('eleves', EleveController::class);
            Route::post('/eleves/{id}/photo',      [EleveController::class, 'updatePhoto']);
            Route::get('/elevesNiveau/{id}',       [EleveController::class, 'ElevesNiveau']);
            Route::get('/elevesClasse/{id}',       [EleveController::class, 'ElevesClasse']);
            Route::get('/elevesParent/{id}',       [EleveController::class, 'ElevesParent']);
            Route::get('/attestation/{eleveId}/scolarite/pdf', [AttestationPdfController::class, 'scolarite']);
        });

        Route::middleware('permission:enseignants')->group(function () {
            Route::apiResource('enseignants',    EnseignantController::class);
            Route::get('/enseignantsTout',                        [EnseignantController::class, 'listeenseignants']);
            Route::get('/enseignantClasse/{id}',                  [EnseignantController::class, 'enseignantClasse']);
            Route::get('/enseignants/{id}/affectations',          [EnseignantController::class, 'affectations']);
            Route::post('/enseignants/{id}/affectations',         [EnseignantController::class, 'sauvegarderAffectations']);
            Route::get('/enseignants/import/template',            [ImportEnseignantController::class, 'template']);
            Route::post('/enseignants/import',                    [ImportEnseignantController::class, 'import']);
            Route::get('/affectations/import/template',           [ImportAffectationController::class, 'template']);
            Route::post('/affectations/import',                   [ImportAffectationController::class, 'import']);
            Route::delete('/enseignants/{id}/tokens',             [EnseignantController::class, 'revoquerTokens']);
        });

        Route::middleware('permission:parents')->group(function () {
            Route::apiResource('parents', ParentController::class);
            Route::delete('/parents/{id}/tokens',                 [ParentController::class, 'revoquerTokens']);
        });

        Route::middleware('permission:pedagogie_saisie')->group(function () {
            Route::get('/remplacements/dashboard',  [RemplacementController::class, 'dashboard']);
            Route::get('/remplacements',            [RemplacementController::class, 'index']);
            Route::post('/remplacements',           [RemplacementController::class, 'store']);
            Route::get('/remplacements/{id}',       [RemplacementController::class, 'show']);
            Route::put('/remplacements/{id}',       [RemplacementController::class, 'update']);
            Route::delete('/remplacements/{id}',    [RemplacementController::class, 'destroy']);
        });

        Route::middleware('permission:pedagogie_saisie')->group(function () {
            Route::get('/volumesHoraires/restant/{classe_id}', [VolumeHoraireController::class, 'restantClasse'])->where('classe_id', '[0-9]+');

            Route::apiResource('emploiDuTemps', EmploiDuTempsController::class);
            Route::get('/emploiDuTempsClasse/{id}', [EmploiDuTempsController::class, 'parClasse']);

            Route::get('/chapitresMatiere/{matiere_id}',         [ChapitreMatiereController::class, 'parMatiere']);
            Route::post('/chapitresMatiere',                     [ChapitreMatiereController::class, 'store']);
            Route::put('/chapitresMatiere/{id}',                 [ChapitreMatiereController::class, 'update']);
            Route::delete('/chapitresMatiere/{id}',              [ChapitreMatiereController::class, 'destroy']);
            Route::get('/progressionMatiere/{matiere_id}',       [ChapitreMatiereController::class, 'progressionParMatiere']);

            Route::apiResource('assiduites', AssiduitesController::class);
            Route::get('/assiduitesFeuille',                     [AssiduitesController::class, 'feuille']);
            Route::post('/assiduitesSauvegarder',                [AssiduitesController::class, 'sauvegarder']);
            Route::get('/assiduitesRecap/{eleveId}/{periodeId}', [AssiduitesController::class, 'recapEleve']);

            Route::get('/devoirs/prochainCode',          [DevoirController::class,    'prochainCode']);
            Route::get('/devoirs/{id}/import/template',  [ImportNoteController::class, 'template']);
            Route::post('/devoirs/{id}/import',          [ImportNoteController::class, 'import']);
            Route::apiResource('devoirs',                DevoirController::class);
            Route::get('/devoirsClasse/{id}',    [DevoirController::class, 'devoirsClasse']);
            Route::get('/devoirsPeriode/{id}',   [DevoirController::class, 'devoirsPeriode']);

            Route::get('/notesDevoir/{id}',       [NoteController::class, 'notesDevoir']);
            Route::post('/notesSauvegarder/{id}', [NoteController::class, 'sauvegarder']);
        });

        Route::middleware('permission:pedagogie_pilotage')->group(function () {
            Route::get('/volumesHoraires/conformite',        [VolumeHoraireController::class, 'conformite']);
            Route::get('/volumesHoraires/chargeEnseignants', [VolumeHoraireController::class, 'chargeEnseignants']);

            Route::get('/bulletin/{eleveId}/{periodeId}',               [NoteController::class,        'bulletin']);
            Route::get('/bulletin/{eleveId}/{periodeId}/pdf',           [BulletinPdfController::class, 'telecharger']);
            Route::post('/bulletin/{eleveId}/{periodeId}/notifier',     [NoteController::class,        'notifierBulletin']);
            Route::get('/bulletins/classe/{classeId}/{periodeId}/pdf',  [BulletinPdfController::class, 'telechargerClasse']);
            Route::get('/releve-annuel/{eleveId}/{annee}',              [ReleveAnnuelController::class, 'telecharger']);
            Route::get('/notes/{periodeId}/export',                     [NoteController::class,        'exportCsv']);
            Route::get('/export/moyennes/{niveauId}/{periodeId}',       [ExportMoyennesController::class, 'export']);

            // Appréciations enseignants + décisions conseil de classe
            Route::get('/appreciations-matiere/{classeId}/{periodeId}', [AppreciationController::class, 'parClasse']);
            Route::post('/appreciations-matiere/batch',                  [AppreciationController::class, 'sauvegarderBatch']);
            Route::get('/decisions-conseil/{classeId}/{periodeId}',     [AppreciationController::class, 'decisionsClasse']);
            Route::post('/decisions-conseil/batch',                      [AppreciationController::class, 'sauvegarderDecisions']);
            Route::get('/moyennes-classe/{classeId}/{periodeId}',       [NoteController::class,         'moyennesClasse']);
        });

        Route::middleware('permission:finances_gestion')->group(function () {
            Route::apiResource('scolarites',         ScolariteController::class);
            Route::get('/scolaritesNiveau/{id}',     [ScolariteController::class, 'ScolaritesNiveau']);
            Route::get('/scolarites/import/template',[ImportScolariteController::class, 'template']);
            Route::post('/scolarites/import',        [ImportScolariteController::class, 'import']);
            Route::get('/impayes',                   [PaiementController::class,  'impayes']);
        });

        Route::middleware('permission:finances_caisse,finances_gestion')->group(function () {
            Route::get('/paiements/export',                    [PaiementController::class,  'exportCsv']);
            Route::post('/paiements/initier',                  [CinetPayController::class,  'initier']);
            Route::get('/paiements/statut/{transactionId}',    [CinetPayController::class,  'statut']);
            Route::apiResource('paiements',                    PaiementController::class);
            Route::get('/paiementsEleve/{id}',                 [PaiementController::class,  'parEleve']);
            Route::get('/paiementsNiveau/{id}',                [PaiementController::class,  'recapNiveau']);
            Route::get('/paiements/{id}/recu',                 [PaiementController::class,  'recu']);
        });

        Route::middleware('permission:communication')->group(function () {
            Route::apiResource('informations', InformationsController::class);
            Route::get('/messages',                   [MessageController::class, 'indexAdmin']);
            Route::get('/messages/conversation/{a}/{b}', [MessageController::class, 'filAdmin']);
        });

        Route::middleware('permission:pedagogie_saisie,pedagogie_pilotage,communication')->group(function () {
            Route::get('/rdv/reservations',           [RdvController::class, 'toutesReservations']);
            Route::get('/rdv/creneaux',               [RdvController::class, 'tousCreneaux']);
        });

        Route::get('/calendrier',         [CalendrierController::class, 'index']);
        Route::middleware('permission:pedagogie_saisie,parametrage')->group(function () {
            Route::post('/calendrier',        [CalendrierController::class, 'store']);
            Route::put('/calendrier/{id}',    [CalendrierController::class, 'update']);
            Route::delete('/calendrier/{id}', [CalendrierController::class, 'destroy']);
        });

        Route::middleware('permission:eleves,pedagogie_saisie')->group(function () {
            Route::get('/sanctions',                    [SanctionController::class, 'index']);
            Route::get('/sanctions/eleve/{eleveId}',    [SanctionController::class, 'parEleve']);
            Route::post('/sanctions',                   [SanctionController::class, 'store']);
            Route::get('/sanctions/{id}',               [SanctionController::class, 'show']);
            Route::put('/sanctions/{id}',               [SanctionController::class, 'update']);
            Route::delete('/sanctions/{id}',            [SanctionController::class, 'destroy']);
            Route::post('/sanctions/{id}/notifier',     [SanctionController::class, 'notifier']);
        });

        Route::middleware('permission:parametrage')->group(function () {
            Route::get('/annees-scolaires',                          [ArchivageController::class, 'index']);
            Route::post('/annees-scolaires',                         [ArchivageController::class, 'store']);
            Route::post('/annees-scolaires/init-nouvelle-annee',     [ArchivageController::class, 'initNouvelleAnnee']);
            Route::get('/annees-scolaires/{id}',                     [ArchivageController::class, 'show']);
            Route::get('/annees-scolaires/{id}/prerequis',           [ArchivageController::class, 'prerequis']);
            Route::get('/annees-scolaires/{id}/bilan-preview',       [ArchivageController::class, 'bilanPreview']);
            Route::get('/annees-scolaires/{id}/bilan',               [ArchivageController::class, 'bilan']);
            Route::post('/annees-scolaires/{id}/initier-cloture',    [ArchivageController::class, 'initierCloture']);
            Route::post('/annees-scolaires/{id}/rollback',           [ArchivageController::class, 'rollback']);
            Route::post('/annees-scolaires/{id}/confirmer',          [ArchivageController::class, 'confirmer']);
        });

        // ─── Seeder (dev uniquement — super admin uniquement, bloqué en production) ──
        Route::post('/seeder/lancer',          [SeederController::class, 'lancer']);
        Route::get('/seeder/status/{jobId}',   [SeederController::class, 'statut']);

        Route::middleware('permission:utilisateurs')->group(function () {
            Route::get('/utilisateurs',                    [UserController::class, 'index']);
            Route::post('/utilisateurs',                   [UserController::class, 'store']);
            Route::put('/utilisateurs/{user}',             [UserController::class, 'update']);
            Route::delete('/utilisateurs/{user}',          [UserController::class, 'destroy']);
            Route::post('/utilisateurs/{user}/photo',      [UserController::class, 'updatePhoto']);

            Route::get('/roles',                  [RoleController::class, 'index']);
            Route::post('/roles',                 [RoleController::class, 'store']);
            Route::get('/roles/{role}',           [RoleController::class, 'show']);
            Route::put('/roles/{role}',           [RoleController::class, 'update']);
            Route::delete('/roles/{role}',        [RoleController::class, 'destroy']);
            Route::get('/roles-permissions',      [RoleController::class, 'permissions']);
        });
    });
});
