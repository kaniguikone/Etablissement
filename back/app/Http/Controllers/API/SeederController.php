<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SeederController extends Controller
{
    // Chemin absolu hors du storage tenant — accessible depuis n'importe quel contexte.
    // Chemin fixe, indépendant du contexte tenant (storage_path() est suffixé par tenancy).
    private static function jobDir(string $jobId): string
    {
        return base_path("storage/seeder-jobs/{$jobId}");
    }

    /**
     * POST /seeder/lancer  (route tenant — tenant_id déduit du contexte)
     */
    public function lancer(Request $request): JsonResponse
    {
        if (app()->isProduction()) {
            return response()->json(['message' => 'Non disponible en production.'], 403);
        }

        if (!$request->user()?->estSuperAdmin()) {
            return response()->json(['message' => 'Réservé aux super administrateurs.'], 403);
        }

        $params = $this->validerParams($request);
        $params['tenant_id'] = tenant()->getTenantKey();

        return $this->creerJob($params);
    }

    /**
     * POST /superadmin/seeder/lancer  (route centrale — tenant_id fourni dans le body)
     */
    public function lancerCentral(Request $request): JsonResponse
    {
        if (app()->isProduction()) {
            return response()->json(['message' => 'Non disponible en production.'], 403);
        }

        $params = $this->validerParams($request);
        $params['tenant_id'] = $request->validate(['tenant_id' => 'required|string'])['tenant_id'];

        return $this->creerJob($params);
    }

    /**
     * GET /seeder/status/{jobId}
     */
    public function statut(Request $request, string $jobId): JsonResponse
    {
        if (app()->isProduction()) {
            return response()->json(['message' => 'Non disponible en production.'], 403);
        }

        if (!$request->user()?->estSuperAdmin()) {
            return response()->json(['message' => 'Réservé aux super administrateurs.'], 403);
        }

        return $this->lireStatut($jobId);
    }

    /**
     * GET /superadmin/seeder/status/{jobId}  (route centrale)
     */
    public function statutCentral(Request $request, string $jobId): JsonResponse
    {
        if (app()->isProduction()) {
            return response()->json(['message' => 'Non disponible en production.'], 403);
        }

        return $this->lireStatut($jobId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validerParams(Request $request): array
    {
        return $request->validate([
            'template'               => 'string|in:lycee,lycee_complet,college,primaire',
            'classes_min'            => 'integer|min:1|max:10',
            'classes_max'            => 'integer|min:1|max:15',
            'eleves_min'             => 'integer|min:1|max:60',
            'eleves_max'             => 'integer|min:1|max:60',
            'nb_enseignants'         => 'integer|min:1|max:200',
            'annee'                  => ['string', 'regex:/^\d{4}-\d{4}$/'],
            'periodes_type'          => 'string|in:trimestre,semestre',
            'avec_eleves'            => 'boolean',
            'avec_emploi'            => 'boolean',
            'avec_devoirs'           => 'boolean',
            'avec_paiements'         => 'boolean',
            'devoirs_min'            => 'integer|min:1|max:5',
            'devoirs_max'            => 'integer|min:1|max:5',
            'assiduites_par_periode' => 'integer|min:1|max:8',
        ]);
    }

    private function creerJob(array $params): JsonResponse
    {
        $jobId = Str::uuid()->toString();
        $dir   = self::jobDir($jobId);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents("{$dir}/params.json", json_encode($params));
        file_put_contents("{$dir}/status.json", json_encode([
            'status' => 'pending',
            'etape'  => 'En attente de démarrage…',
            'stats'  => [],
            'errors' => [],
            'ts'     => time(),
        ]));

        $this->lancerProcessus($jobId);

        return response()->json(['job_id' => $jobId]);
    }

    private function lireStatut(string $jobId): JsonResponse
    {
        $file = self::jobDir($jobId) . '/status.json';

        if (!file_exists($file)) {
            return response()->json(['status' => 'not_found'], 404);
        }

        return response()->json(json_decode(file_get_contents($file), true));
    }

    private function lancerProcessus(string $jobId): void
    {
        $php     = PHP_BINARY;
        $artisan = base_path('artisan');
        $log     = self::jobDir($jobId) . '/artisan.log';

        if (PHP_OS_FAMILY === 'Windows') {
            // `start /B` via cmd.exe — lance le processus détaché et retourne immédiatement.
            // proc_close() bloquerait jusqu'à la fin du seed, ce qui gèlerait la réponse HTTP.
            $cmd = 'start /B "" "' . $php . '" "' . $artisan . '" seed:web "' . $jobId . '" > "' . $log . '" 2>&1';
            pclose(popen($cmd, 'r'));
        } else {
            $cmd = "\"{$php}\" \"{$artisan}\" seed:web \"{$jobId}\" >> \"{$log}\" 2>&1 &";
            exec($cmd);
        }
    }
}
