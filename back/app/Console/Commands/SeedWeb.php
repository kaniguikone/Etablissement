<?php

namespace App\Console\Commands;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Informations;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\Parents;
use App\Models\Periodes;
use App\Models\Scolarites;
use App\Models\Tenant;
use App\Models\TypeDevoir;
use App\Services\TemplateService;
use Database\Seeders\AdminSeeder;
use Database\Seeders\CalendrierSeeder;
use Database\Seeders\ChapitresMatiereSeeder;
use Database\Seeders\ClasseEnseignantMatiereSeeder;
use Database\Seeders\DevoirNoteAssiduitesSeeder;
use Database\Seeders\EmploiDuTempsSeeder;
use Database\Seeders\EnseignantAuthSeeder;
use Database\Seeders\ImpaiesSeeder;
use Database\Seeders\NotificationSeeder;
use Database\Seeders\PaiementSeeder;
use Database\Seeders\ParentAuthSeeder;
use Database\Seeders\PhotoEleveSeeder;
use Database\Seeders\ProgressionSeeder;
use Database\Seeders\RecuPaiementSeeder;
use Database\Seeders\SanctionSeeder;
use Database\Seeders\VolumeHoraireSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SeedWeb extends Command
{
    protected $signature   = 'seed:web {job_id}';
    protected $description = 'Lance un seed configuré via l\'interface web (tourne en arrière-plan).';

    private const TABLES = [
        'sanctions', 'calendriers', 'notifications', 'recus_paiements',
        'impaies', 'volume_horaires', 'progressions', 'chapitres_matiere',
        'emploi_du_temps', 'paiements', 'notes', 'devoirs', 'assiduites',
        'scolarites', 'informations', 'type_devoirs',
        'eleves', 'parents', 'enseignants', 'classe_enseignant_matiere',
        'classe_enseignant_matiere', 'niveau_matieres',
        'classes', 'niveaux', 'series', 'matieres', 'periodes',
        'annees_scolaires', 'salles',
    ];

    public array $seedContext = [];

    private string $jobId;
    private string $jobDir;

    // Même chemin que SeederController — indépendant du contexte tenant.
    private function jobDir(): string
    {
        return base_path("storage/seeder-jobs/{$this->jobId}");
    }

    public function handle(): int
    {
        $this->jobId = $this->argument('job_id');
        $paramsFile  = $this->jobDir() . '/params.json';

        if (!file_exists($paramsFile)) {
            $this->ecrireStatut('error', [], ['SeedWeb' => 'Fichier de paramètres introuvable : ' . $paramsFile]);
            return 1;
        }

        $params = json_decode(file_get_contents($paramsFile), true);

        // Initialiser le contexte tenant
        $tenant = Tenant::find($params['tenant_id'] ?? null);
        if (!$tenant) {
            $this->ecrireStatut('error', [], ['SeedWeb' => 'Tenant introuvable : ' . ($params['tenant_id'] ?? 'null')]);
            return 1;
        }

        tenancy()->initialize($tenant);

        try {
            [$stats, $errors] = $this->lancerSeed($params);
            $this->ecrireStatut('done', $stats, $errors);
        } catch (\Throwable $e) {
            $this->ecrireStatut('error', [], ['fatal' => $e->getMessage() . ' L' . $e->getLine() . ' ' . basename($e->getFile())]);
        } finally {
            tenancy()->end();
        }

        return 0;
    }

    private function lancerSeed(array $p): array
    {
        $template      = $p['template']       ?? 'lycee_complet';
        $classesMin    = $p['classes_min']    ?? 3;
        $classesMax    = max($classesMin, $p['classes_max'] ?? 5);
        $elevesMin     = $p['eleves_min']     ?? 20;
        $elevesMax     = max($elevesMin, $p['eleves_max'] ?? 35);
        $nbEnseignants = $p['nb_enseignants'] ?? 60;
        $annee         = $p['annee']          ?? $this->anneeEnCours();
        $periodesType  = $p['periodes_type']  ?? 'trimestre';
        $avecEleves    = $p['avec_eleves']    ?? true;
        $avecEmploi    = $p['avec_emploi']    ?? true;
        $avecDevoirs   = $p['avec_devoirs']   ?? true;
        $avecPaiements = $p['avec_paiements'] ?? true;

        $templateData = TemplateService::charger($template);

        $stats  = [];
        $errors = [];

        $this->ecrireStatut('running', [], [], 'Nettoyage des tables…');

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        foreach (array_unique(self::TABLES) as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
            }
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->ecrireStatut('running', [], [], 'Création des matières et niveaux…');

        foreach ($templateData['matieres'] as $m) {
            Matiere::create([
                'abbr_matiere'        => $m['abbr_matiere'],
                'libelle_matiere'     => $m['libelle_matiere'],
                'description_matiere' => Str::slug($m['libelle_matiere']),
            ]);
        }
        $stats['matieres'] = count($templateData['matieres']);

        foreach ($templateData['niveaux'] as $n) {
            Niveau::create([
                'nom_niveau'  => $n['nom_niveau'],
                'abbr_niveau' => $n['abbr_niveau'],
                'ordre'       => $n['ordre'],
            ]);
        }
        $stats['niveaux'] = count($templateData['niveaux']);

        $stats['periodes']   = $this->creerPeriodes($annee, $periodesType, $templateData);
        $stats['scolarites'] = $this->creerScolarites();

        foreach ($templateData['type_devoirs'] as $td) {
            TypeDevoir::create([
                'code_type_devoir'        => $td['code_type_devoir'],
                'description_type_devoir' => $td['description_type_devoir'],
            ]);
        }
        $stats['type_devoirs'] = count($templateData['type_devoirs']);

        // Niveau-matières (utile pour ChapitresMatiereSeeder, VolumeHoraireSeeder)
        $niveauxMap  = Niveau::pluck('id', 'nom_niveau')->toArray();
        $matieresMap = Matiere::pluck('id', 'libelle_matiere')->toArray();
        $nmCount = 0;
        foreach ($templateData['niveau_matieres'] as $nm) {
            $niveauId  = $niveauxMap[$nm['niveau']] ?? null;
            $matiereId = $matieresMap[$nm['matiere']] ?? null;
            if (!$niveauId || !$matiereId) continue;
            DB::table('niveau_matieres')->insertOrIgnore([
                'niveau_id'            => $niveauId,
                'matiere_id'           => $matiereId,
                'serie_id'             => null,
                'groupe_alternatif_id' => null,
                'obligatoire'          => 1,
                'coefficient'          => $nm['coefficient'],
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);
            $nmCount++;
        }
        $stats['niveau_matieres'] = $nmCount;

        $stats['informations'] = $this->creerInformations($annee);

        $this->ecrireStatut('running', $stats, [], 'Création des classes…');

        foreach (Niveau::all() as $niveau) {
            $nb = rand($classesMin, $classesMax);
            for ($i = 1; $i <= $nb; $i++) {
                Classe::factory()->create([
                    'num_classe'  => $i,
                    'nom_classe'  => $niveau->nom_niveau . ' ' . $i,
                    'abbr_classe' => $niveau->abbr_niveau . $i,
                    'niveau_id'   => $niveau->id,
                ]);
            }
        }
        $stats['classes'] = Classe::count();

        if ($avecEleves) {
            $this->ecrireStatut('running', $stats, [], 'Création des élèves et parents…');
            $r = $this->creerElevesEtParents($elevesMin, $elevesMax);
            $stats['eleves']  = $r['eleves'];
            $stats['parents'] = $r['parents'];
        }

        $this->ecrireStatut('running', $stats, [], 'Création des enseignants…');
        Enseignant::factory()->count($nbEnseignants)->create();
        $enseignantIds = Enseignant::pluck('id')->toArray();
        $cursor = 0;
        foreach (Classe::all() as $classe) {
            $classe->update(['professeur_principal_id' => $enseignantIds[$cursor % count($enseignantIds)]]);
            $cursor++;
        }
        $stats['enseignants'] = $nbEnseignants;

        $this->ecrireStatut('running', $stats, [], 'Comptes utilisateurs…');
        $this->runSeeder(AdminSeeder::class, $errors);

        $this->seedContext = [
            'devoirs_min'            => $p['devoirs_min']            ?? 1,
            'devoirs_max'            => max($p['devoirs_min'] ?? 1, $p['devoirs_max'] ?? 2),
            'assiduites_par_periode' => $p['assiduites_par_periode'] ?? 3,
        ];

        $this->ecrireStatut('running', $stats, $errors, 'Affectations matières…');
        $this->runSeeder(ClasseEnseignantMatiereSeeder::class, $errors);
        $stats['affectations_matieres'] = DB::table('classe_enseignant_matiere')->count();

        if ($avecEmploi) {
            $this->ecrireStatut('running', $stats, $errors, 'Emploi du temps…');
            $this->runSeeder(EmploiDuTempsSeeder::class, $errors);
            $stats['emploi_du_temps'] = DB::table('emploi_du_temps')->count();
        }

        if ($avecDevoirs && $avecEleves) {
            $this->ecrireStatut('running', $stats, $errors, 'Devoirs, notes et assiduités…');
            $this->runSeeder(DevoirNoteAssiduitesSeeder::class, $errors);
            $stats['devoirs']    = DB::table('devoirs')->count();
            $stats['notes']      = DB::table('notes')->count();
            $stats['assiduites'] = DB::table('assiduites')->count();
        }

        if ($avecPaiements && $avecEleves) {
            $this->ecrireStatut('running', $stats, $errors, 'Paiements…');
            $this->runSeeder(PaiementSeeder::class, $errors);
            $stats['paiements'] = DB::table('paiements')->count();
        }

        if ($avecEleves) { $this->runSeeder(ParentAuthSeeder::class, $errors); }
        $this->runSeeder(EnseignantAuthSeeder::class, $errors);
        if ($avecEleves) { $this->runSeeder(PhotoEleveSeeder::class, $errors); }

        $this->ecrireStatut('running', $stats, $errors, 'Chapitres, progressions, volumes…');
        $this->runSeeder(ChapitresMatiereSeeder::class, $errors);
        $this->runSeeder(ProgressionSeeder::class, $errors);
        $this->runSeeder(VolumeHoraireSeeder::class, $errors);

        if ($avecPaiements && $avecEleves) {
            $this->runSeeder(ImpaiesSeeder::class, $errors);
            $this->runSeeder(RecuPaiementSeeder::class, $errors);
        }

        $this->runSeeder(NotificationSeeder::class, $errors);
        $this->runSeeder(CalendrierSeeder::class, $errors);
        if ($avecEleves) { $this->runSeeder(SanctionSeeder::class, $errors); }

        return [$stats, $errors];
    }

    // ── Helpers seeds ─────────────────────────────────────────────────────────

    private function runSeeder(string $class, array &$errors): void
    {
        try {
            $seeder = app($class);
            $prop = (new \ReflectionObject($seeder))->getProperty('command');
            $prop->setAccessible(true);
            $prop->setValue($seeder, $this);
            $seeder->run();
        } catch (\Throwable $e) {
            $court = class_basename($class);
            $errors[$court] = $e->getMessage() . ' (L' . $e->getLine() . ' ' . basename($e->getFile()) . ')';
            \Illuminate\Support\Facades\Log::error("SeedWeb [{$court}]: " . $e->getMessage());
        }
    }

    private function creerPeriodes(string $annee, string $type, array $templateData): int
    {
        [$debut, $fin] = explode('-', $annee);

        $defaultDates = $type === 'semestre' ? [
            ["{$debut}-09-02", "{$fin}-01-31"],
            ["{$fin}-02-01",   "{$fin}-06-30"],
        ] : [
            ["{$debut}-09-02", "{$debut}-12-20"],
            ["{$fin}-01-02",   "{$fin}-03-10"],
            ["{$fin}-03-15",   "{$fin}-05-20"],
        ];

        $anneeScolaireId = DB::table('annees_scolaires')->insertGetId([
            'libelle'    => $annee,
            'date_debut' => "{$debut}-09-01",
            'date_fin'   => "{$fin}-06-30",
            'statut'     => 'en_cours',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $templatePeriodes = $templateData['periodes_' . $type] ?? $templateData['periodes_trimestre'];
        foreach ($templatePeriodes as $i => $p) {
            [$d, $f] = $defaultDates[$i] ?? ["{$debut}-09-02", "{$fin}-06-30"];
            Periodes::create([
                'annee_scolaire_id'    => $anneeScolaireId,
                'libelle_periode'      => $p['libelle_periode'],
                'abbr_libelle_periode' => $p['abbr_libelle_periode'],
                'code_periode'         => $p['code_periode'],
                'annee'                => $annee,
                'date_debut'           => $d,
                'date_fin'             => $f,
            ]);
        }
        return count($templatePeriodes);
    }

    private function creerScolarites(): int
    {
        $dates = ['2024-10-05', '2024-11-05', '2024-12-05', '2025-01-05', '2025-02-05'];
        $count = 0;
        foreach (Niveau::orderBy('ordre')->get() as $niveau) {
            $base = 40000 + ($niveau->ordre * 5000);
            foreach ($dates as $i => $date) {
                Scolarites::create([
                    'libelle_echeance'  => ($i + 1) . 'ème versement',
                    'date_echeance'     => $date,
                    'montant_echeance'  => max(10000, $base - ($i * 2000)),
                    'niveau_id'         => $niveau->id,
                ]);
                $count++;
            }
        }
        return $count;
    }

    private function creerInformations(string $annee): int
    {
        [$debut, $fin] = explode('-', $annee);
        $infos = [
            ["{$debut}-10-05", 'Devoir de Mathématiques', "Devoir de Mathématiques des classes de Seconde le 02/11/{$debut}."],
            ["{$debut}-11-10", 'Congés de Toussaint',     "Congé du 01/11/{$debut} au 03/11/{$debut}."],
            ["{$debut}-12-05", 'Journée Porte Ouverte',   'Rencontre des professeurs et retrait des bulletins T1.'],
            ["{$fin}-01-05",   'Devoir de SVT',           "Devoir de SVT — Terminale — le 15/01/{$fin}."],
            ["{$fin}-01-15",   'Réunion de rentrée',      'Réunion de rentrée du 2ème trimestre.'],
            ["{$fin}-02-10",   'Congés de Carnaval',      "Congé du 17/02/{$fin} au 21/02/{$fin}."],
            ["{$fin}-03-05",   'Remise des bulletins T2', "Bulletins remis aux parents le 15/03/{$fin} à 8h."],
            ["{$fin}-03-20",   "Composition de fin d'année", "Compositions du 3ème trimestre le 10/05/{$fin}."],
        ];
        foreach ($infos as [$date, $titre, $contenu]) {
            Informations::create(['date_info' => $date, 'titre' => $titre, 'contenu' => $contenu]);
        }
        return count($infos);
    }

    private function creerElevesEtParents(int $eMin, int $eMax): array
    {
        $classeSizes = [];
        $total = 0;
        foreach (Classe::all() as $classe) {
            $nb = rand($eMin, $eMax);
            $classeSizes[$classe->id] = $nb;
            $total += $nb;
        }
        $nbParents = max((int) ceil($total / 4), (int) round($total / 2.5));
        Parents::factory()->count($nbParents)->create();
        $pids = Parents::pluck('id')->toArray();
        shuffle($pids);

        $pool = $pids;
        $cnt  = array_fill_keys($pids, 1);
        $avail = $pids;
        $rest  = $total - $nbParents;
        while ($rest > 0 && !empty($avail)) {
            $idx = array_rand($avail);
            $pid = $avail[$idx];
            $pool[] = $pid;
            $cnt[$pid]++;
            $rest--;
            if ($cnt[$pid] >= 4) array_splice($avail, $idx, 1);
        }
        shuffle($pool);

        $cursor = 0;
        foreach ($classeSizes as $cid => $nb) {
            for ($j = 0; $j < $nb; $j++) {
                Eleve::factory()->create(['classe_id' => $cid, 'parent_id' => $pool[$cursor++]]);
            }
        }
        return ['eleves' => $total, 'parents' => $nbParents];
    }

    private function ecrireStatut(string $status, array $stats, array $errors, string $etape = ''): void
    {
        $dir  = $this->jobDir();
        $file = $dir . '/status.json';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        file_put_contents($file, json_encode([
            'status' => $status,
            'etape'  => $etape,
            'stats'  => $stats,
            'errors' => $errors,
            'ts'     => time(),
        ]));
    }

    private function anneeEnCours(): string
    {
        $m = (int) date('n');
        $y = (int) date('Y');
        return $m >= 9 ? "{$y}-" . ($y + 1) : ($y - 1) . "-{$y}";
    }
}
