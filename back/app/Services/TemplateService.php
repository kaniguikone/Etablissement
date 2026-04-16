<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

class TemplateService
{
    private const TEMPLATES_PATH = 'database/templates';
    private const SEMAINES_ANNEE  = 36;

    /**
     * Liste des templates disponibles.
     */
    public static function liste(): array
    {
        return [
            'lycee'         => ['nom' => 'Lycée',               'description' => 'Seconde / Première / Terminale — Séries A1, A2, B, C, D'],
            'lycee_complet' => ['nom' => 'Lycée Complet',       'description' => '6ème → Terminale (collège + lycée) — Séries A1, A2, B, C, D'],
            'college'       => ['nom' => 'Collège',             'description' => '6ème / 5ème / 4ème / 3ème — BEPC'],
            'primaire'      => ['nom' => 'École Primaire',      'description' => 'CP1 / CP2 / CE1 / CE2 / CM1 / CM2'],
        ];
    }

    /**
     * Applique un template à un tenant.
     *
     * @param  string  $tenantId     ID du tenant
     * @param  string  $type         'lycee' | 'college' | 'primaire'
     * @param  string  $annee        Ex: "2024-2025"
     * @param  string  $periodesType 'trimestre' | 'semestre'
     * @return array   Statistiques de création
     */
    public function appliquer(string $tenantId, string $type, string $annee, string $periodesType = 'trimestre'): array
    {
        $template = $this->chargerTemplate($type);

        $stats = [
            'annee_scolaire' => 0,
            'niveaux'        => 0,
            'series'         => 0,
            'matieres'       => 0,
            'type_devoirs'   => 0,
            'periodes'       => 0,
            'niveau_matieres'=> 0,
            'volumes_horaires'=> 0,
        ];

        tenancy()->initialize(Tenant::findOrFail($tenantId));

        DB::transaction(function () use ($template, $annee, $periodesType, &$stats) {
            // 1. Année scolaire
            $anneeDebut = explode('-', $annee)[0] ?? date('Y');
            $anneeFin   = explode('-', $annee)[1] ?? (date('Y') + 1);
            $anneeScolaire = DB::table('annees_scolaires')
                ->where('libelle', $annee)
                ->first();

            if (!$anneeScolaire) {
                $anneeScolaireId = DB::table('annees_scolaires')->insertGetId([
                    'libelle'    => $annee,
                    'date_debut' => "{$anneeDebut}-09-01",
                    'date_fin'   => "{$anneeFin}-06-30",
                    'statut'     => 'en_cours',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $stats['annee_scolaire']++;
            } else {
                $anneeScolaireId = $anneeScolaire->id;
            }

            // 2. Niveaux
            $niveauxMap = [];
            foreach ($template['niveaux'] as $n) {
                $existing = DB::table('niveaux')->where('nom_niveau', $n['nom_niveau'])->first();
                if (!$existing) {
                    $id = DB::table('niveaux')->insertGetId([
                        'nom_niveau'  => $n['nom_niveau'],
                        'abbr_niveau' => $n['abbr_niveau'],
                        'ordre'       => $n['ordre'],
                    ]);
                    $stats['niveaux']++;
                } else {
                    $id = $existing->id;
                }
                $niveauxMap[$n['nom_niveau']] = $id;
            }

            // 3. Séries
            $seriesMap = [];
            foreach ($template['series'] as $s) {
                $existing = DB::table('series')->where('nom', $s['nom'])->first();
                if (!$existing) {
                    $id = DB::table('series')->insertGetId([
                        'nom'         => $s['nom'],
                        'description' => $s['description'],
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ]);
                    $stats['series']++;
                } else {
                    $id = $existing->id;
                }
                $seriesMap[$s['nom']] = $id;
            }

            // 4. Matières
            $matieresMap = [];
            foreach ($template['matieres'] as $m) {
                $existing = DB::table('matieres')->where('libelle_matiere', $m['libelle_matiere'])->first();
                if (!$existing) {
                    $id = DB::table('matieres')->insertGetId([
                        'libelle_matiere'     => $m['libelle_matiere'],
                        'abbr_matiere'        => $m['abbr_matiere'],
                        'description_matiere' => $m['libelle_matiere'],
                    ]);
                    $stats['matieres']++;
                } else {
                    $id = $existing->id;
                }
                $matieresMap[$m['libelle_matiere']] = $id;
            }

            // 5. Types de devoirs
            foreach ($template['type_devoirs'] as $td) {
                $existing = DB::table('type_devoirs')->where('code_type_devoir', $td['code_type_devoir'])->first();
                if (!$existing) {
                    DB::table('type_devoirs')->insert([
                        'code_type_devoir'        => $td['code_type_devoir'],
                        'description_type_devoir' => $td['description_type_devoir'],
                    ]);
                    $stats['type_devoirs']++;
                }
            }

            // 6. Périodes
            $key = 'periodes_' . $periodesType;
            $periodesData = $template[$key] ?? $template['periodes_trimestre'];
            foreach ($periodesData as $p) {
                $existing = DB::table('periodes')
                    ->where('code_periode', $p['code_periode'])
                    ->where('annee', $annee)
                    ->first();
                if (!$existing) {
                    // Dates par défaut : septembre → juin de l'année scolaire
                    $dateDebut = $p['date_debut'] ?? "{$anneeDebut}-09-01";
                    $dateFin   = $p['date_fin']   ?? "{$anneeFin}-06-30";
                    DB::table('periodes')->insert([
                        'annee_scolaire_id'    => $anneeScolaireId,
                        'libelle_periode'      => $p['libelle_periode'],
                        'abbr_libelle_periode' => $p['abbr_libelle_periode'],
                        'code_periode'         => $p['code_periode'],
                        'annee'                => $annee,
                        'date_debut'           => $dateDebut,
                        'date_fin'             => $dateFin,
                    ]);
                    $stats['periodes']++;
                }
            }

            // 7. Niveau-matières + volumes horaires
            foreach ($template['niveau_matieres'] as $nm) {
                $niveauId  = $niveauxMap[$nm['niveau']] ?? null;
                $matiereId = $matieresMap[$nm['matiere']] ?? null;
                $serieId   = $nm['serie'] ? ($seriesMap[$nm['serie']] ?? null) : null;

                if (!$niveauId || !$matiereId) continue;

                $existing = DB::table('niveau_matieres')
                    ->where('niveau_id',  $niveauId)
                    ->where('matiere_id', $matiereId)
                    ->where('serie_id',   $serieId)
                    ->first();

                if (!$existing) {
                    DB::table('niveau_matieres')->insert([
                        'niveau_id'           => $niveauId,
                        'matiere_id'          => $matiereId,
                        'serie_id'            => $serieId,
                        'groupe_alternatif_id'=> null,
                        'obligatoire'         => 1,
                        'coefficient'         => $nm['coefficient'],
                        'created_at'          => now(),
                        'updated_at'          => now(),
                    ]);
                    $stats['niveau_matieres']++;
                }

                // Volume horaire
                if (isset($nm['heures_semaine'])) {
                    $existingVh = DB::table('volumes_horaires')
                        ->where('niveau_id',  $niveauId)
                        ->where('matiere_id', $matiereId)
                        ->first();
                    if (!$existingVh) {
                        DB::table('volumes_horaires')->insert([
                            'niveau_id'      => $niveauId,
                            'matiere_id'     => $matiereId,
                            'heures_semaine' => $nm['heures_semaine'],
                            'semaines_annee' => self::SEMAINES_ANNEE,
                            'created_at'     => now(),
                            'updated_at'     => now(),
                        ]);
                        $stats['volumes_horaires']++;
                    }
                }
            }
        });

        tenancy()->end();

        return $stats;
    }

    /**
     * Charge un template depuis son fichier JSON.
     */
    public static function charger(string $type): array
    {
        $path = base_path(self::TEMPLATES_PATH . "/{$type}.json");

        if (!file_exists($path)) {
            throw new \InvalidArgumentException("Template inconnu : {$type}");
        }

        return json_decode(file_get_contents($path), true);
    }

    /**
     * Sauvegarde un template dans son fichier JSON.
     */
    public static function sauvegarder(string $type, array $data): void
    {
        $path = base_path(self::TEMPLATES_PATH . "/{$type}.json");

        if (!file_exists($path)) {
            throw new \InvalidArgumentException("Template inconnu : {$type}");
        }

        file_put_contents(
            $path,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    private function chargerTemplate(string $type): array
    {
        return self::charger($type);
    }
}
