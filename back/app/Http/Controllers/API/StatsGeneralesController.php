<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\Classe;
use App\Models\Niveau;
use App\Models\ResultatExamen;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;

class StatsGeneralesController extends Controller
{
    // =========================================================================
    // HELPERS
    // =========================================================================

    private function annee(Request $request): AnneeScolaire
    {
        $id = $request->query('annee_id');
        return $id
            ? AnneeScolaire::findOrFail($id)
            : AnneeScolaire::where('statut', 'en_cours')->firstOrFail();
    }

    /** [total, filles] pour un ensemble de classes avec conditions optionnelles. */
    private function eff(array $classeIds, array $where = []): array
    {
        if (empty($classeIds)) return [0, 0];
        $q = DB::table('eleves')->whereIn('classe_id', $classeIds);
        foreach ($where as $col => $val) {
            $q->where($col, $val);
        }
        return [$q->count(), (clone $q)->where('genre_eleve', 'F')->count()];
    }

    /** [total, filles] avec closure pour conditions complexes. */
    private function effClosure(array $classeIds, \Closure $cb): array
    {
        if (empty($classeIds)) return [0, 0];
        $q = DB::table('eleves')->whereIn('classe_id', $classeIds);
        $cb($q);
        return [$q->count(), (clone $q)->where('genre_eleve', 'F')->count()];
    }

    /**
     * Détecte les cycles et retourne :
     * - premierCycle : [['niveau' => Niveau, 'classes' => [ids]], ...]
     * - secondCycle  : [['niveau' => Niveau, 'series' => [{serie_id, serie_nom}], 'classes' => [ids]], ...]
     */
    private function detectCycles(): array
    {
        $niveaux      = Niveau::orderBy('ordre')->get();
        $premierCycle = [];
        $secondCycle  = [];

        foreach ($niveaux as $niveau) {
            $hasSeries = Classe::where('niveau_id', $niveau->id)
                ->whereNotNull('serie_id')->exists();

            $classeIds = Classe::where('niveau_id', $niveau->id)->pluck('id')->toArray();

            if ($hasSeries) {
                $series = DB::table('classes')
                    ->join('series', 'classes.serie_id', '=', 'series.id')
                    ->where('classes.niveau_id', $niveau->id)
                    ->whereNotNull('classes.serie_id')
                    ->select('series.id as serie_id', 'series.nom as serie_nom')
                    ->distinct()->orderBy('series.nom')->get();

                $secondCycle[] = [
                    'niveau'  => $niveau,
                    'series'  => $series,
                    'classes' => $classeIds,
                ];
            } else {
                $premierCycle[] = ['niveau' => $niveau, 'classes' => $classeIds];
            }
        }

        return [$premierCycle, $secondCycle];
    }

    /** Colonnes du 2nd cycle : [{label, niveau_abbr, serie_nom, classes:[ids]}] */
    private function colonnes2c(array $secondCycle): array
    {
        $cols = [];
        foreach ($secondCycle as $item) {
            foreach ($item['series'] as $s) {
                $ids = DB::table('classes')
                    ->where('niveau_id', $item['niveau']->id)
                    ->where('serie_id', $s->serie_id)
                    ->pluck('id')->toArray();
                $cols[] = [
                    'label'   => $item['niveau']->abbr_niveau . ' ' . $s->serie_nom,
                    'classes' => $ids,
                ];
            }
        }
        return $cols;
    }

    /** IDs des redoublants de l'année en cours (via passage_classes de l'année précédente). */
    private function redoublantIds(AnneeScolaire $annee): array
    {
        $precId = AnneeScolaire::where('id', '<', $annee->id)
            ->orderByDesc('id')->value('id');
        if (!$precId) return [];

        return DB::table('passage_classes')
            ->where('annee_scolaire_id', $precId)
            ->where('decision', 'redoublant')
            ->where('applique', true)
            ->pluck('eleve_id')->toArray();
    }

    /** ID de la dernière période de l'année (pour les décisions conseil). */
    private function dernierePeriodeId(int $anneeId): ?int
    {
        return DB::table('periodes')
            ->where('annee_scolaire_id', $anneeId)
            ->orderByDesc('date_fin')->value('id');
    }

    // =========================================================================
    // SECTIONS DE DONNÉES
    // =========================================================================

    // --- S1 : Groupes pédagogiques & salles (1er cycle) ----------------------

    private function s1_groupesPedago(array $premierCycle): array
    {
        $lignes = [];
        $tG = 0; $tS = 0;

        foreach ($premierCycle as $item) {
            $g = Classe::where('niveau_id', $item['niveau']->id)->count();
            $s = Classe::where('niveau_id', $item['niveau']->id)
                ->whereNotNull('salle_classe')->where('salle_classe', '!=', '')
                ->distinct('salle_classe')->count('salle_classe');
            $lignes[] = ['niveau' => $item['niveau']->abbr_niveau, 'groupes' => $g, 'salles' => $s];
            $tG += $g; $tS += $s;
        }

        return ['lignes' => $lignes, 'total' => ['groupes' => $tG, 'salles' => $tS]];
    }

    // --- S2 : Effectifs + boursiers (1er cycle) -------------------------------

    private function s2_effectifsBoursiers(array $premierCycle): array
    {
        $lignes = [];
        $tot = ['effectif' => [0,0], 'affectes' => [0,0], 'boursiers' => [0,0], 'demi_boursiers' => [0,0]];

        foreach ($premierCycle as $item) {
            $c = $item['classes'];
            $e  = $this->eff($c);
            $af = $this->eff($c, ['est_affecte' => true]);
            $bo = $this->eff($c, ['est_boursier' => true]);
            $db = $this->eff($c, ['est_demi_boursier' => true]);

            $lignes[] = [
                'niveau'         => $item['niveau']->abbr_niveau,
                'effectif'       => $e,
                'affectes'       => $af,
                'boursiers'      => $bo,
                'demi_boursiers' => $db,
            ];

            foreach (['effectif' => $e, 'affectes' => $af, 'boursiers' => $bo, 'demi_boursiers' => $db] as $k => $v) {
                $tot[$k][0] += $v[0]; $tot[$k][1] += $v[1];
            }
        }

        return ['lignes' => $lignes, 'total' => $tot];
    }

    // --- S3 : Langues (1er cycle) --------------------------------------------

    private function s3_langues(array $premierCycle): array
    {
        // Anglais est obligatoire pour tous — ligne = effectif total de chaque niveau
        $anglaisRow = ['langue' => 'Anglais'];
        $anglaisTot = [0, 0];
        foreach ($premierCycle as $item) {
            $eff = $this->eff($item['classes']);
            $anglaisRow[$item['niveau']->abbr_niveau] = $eff;
            $anglaisTot[0] += $eff[0]; $anglaisTot[1] += $eff[1];
        }
        $anglaisRow['total'] = $anglaisTot;
        $result = [$anglaisRow];

        foreach (['espagnol', 'allemand', 'autre'] as $langue) {
            $row = ['langue' => ucfirst($langue)];
            $tot = [0, 0];
            foreach ($premierCycle as $item) {
                $eff = $this->eff($item['classes'], ['langue2' => $langue]);
                $row[$item['niveau']->abbr_niveau] = $eff;
                $tot[0] += $eff[0]; $tot[1] += $eff[1];
            }
            $row['total'] = $tot;
            $result[]     = $row;
        }

        return $result;
    }

    // --- S4 : Nationalités 1er cycle -----------------------------------------

    private function s4_nationalites1c(array $premierCycle): array
    {
        $allIds = array_merge(...array_column($premierCycle, 'classes'));
        if (empty($allIds)) return [];

        $nats = DB::table('eleves')->whereIn('classe_id', $allIds)
            ->whereNotNull('nationalite_eleve')->where('nationalite_eleve', '!=', '')
            ->selectRaw('UPPER(TRIM(nationalite_eleve)) as nat')
            ->distinct()->orderBy('nat')->pluck('nat')->toArray();

        $result = [];

        foreach ($nats as $nat) {
            $row = ['nationalite' => $nat];
            $tot = [0, 0];

            foreach ($premierCycle as $item) {
                $eff = $this->effClosure($item['classes'], fn($q)
                    => $q->whereRaw('UPPER(TRIM(nationalite_eleve)) = ?', [$nat]));
                $row[$item['niveau']->abbr_niveau] = $eff;
                $tot[0] += $eff[0]; $tot[1] += $eff[1];
            }

            $row['total'] = $tot;
            $result[]     = $row;
        }

        // Ligne effectif total
        $effRow = ['nationalite' => '— TOTAL EFFECTIF'];
        $gt = [0, 0];
        foreach ($premierCycle as $item) {
            $eff = $this->eff($item['classes']);
            $effRow[$item['niveau']->abbr_niveau] = $eff;
            $gt[0] += $eff[0]; $gt[1] += $eff[1];
        }
        $effRow['total'] = $gt;
        $result[]        = $effRow;

        return $result;
    }

    // --- S5 : Nationalités 2nd cycle -----------------------------------------

    private function s5_nationalites2c(array $secondCycle): array
    {
        $cols   = $this->colonnes2c($secondCycle);
        $allIds = array_merge(...array_column($cols, 'classes') ?: [[]]);
        if (empty($allIds)) return ['colonnes' => [], 'lignes' => []];

        $nats = DB::table('eleves')->whereIn('classe_id', $allIds)
            ->whereNotNull('nationalite_eleve')->where('nationalite_eleve', '!=', '')
            ->selectRaw('UPPER(TRIM(nationalite_eleve)) as nat')
            ->distinct()->orderBy('nat')->pluck('nat')->toArray();

        $result = [];

        foreach ($nats as $nat) {
            $row = ['nationalite' => $nat];
            $tot = [0, 0];

            foreach ($cols as $col) {
                $eff = $this->effClosure($col['classes'], fn($q)
                    => $q->whereRaw('UPPER(TRIM(nationalite_eleve)) = ?', [$nat]));
                $row[$col['label']] = $eff;
                $tot[0] += $eff[0]; $tot[1] += $eff[1];
            }

            $row['total'] = $tot;
            $result[]     = $row;
        }

        $effRow = ['nationalite' => '— TOTAL EFFECTIF'];
        $gt = [0, 0];
        foreach ($cols as $col) {
            $eff = $this->eff($col['classes']);
            $effRow[$col['label']] = $eff;
            $gt[0] += $eff[0]; $gt[1] += $eff[1];
        }
        $effRow['total'] = $gt;
        $result[]        = $effRow;

        return ['colonnes' => array_column($cols, 'label'), 'lignes' => $result];
    }

    // --- S6 : Affectés 1er cycle ---------------------------------------------

    private function s6_affectes1c(array $premierCycle): array
    {
        return $this->s_affectes($premierCycle, 'niveau');
    }

    // --- S7 : Affectés 2nd cycle ---------------------------------------------

    private function s7_affectes2c(array $secondCycle): array
    {
        $cols = $this->colonnes2c($secondCycle);
        return $this->s_affectes($cols, 'label');
    }

    private function s_affectes(array $items, string $labelKey): array
    {
        $colonnes    = [];
        $inscritsRow = ['rubrique' => 'Total inscrits'];
        $affectesRow = ['rubrique' => "Dont affectés de l'État"];
        $totIns      = [0, 0];
        $totAff      = [0, 0];

        foreach ($items as $item) {
            $col  = $item[$labelKey]->abbr_niveau ?? $item[$labelKey];
            $cids = $item['classes'];

            $ins = $this->eff($cids);
            $aff = $this->eff($cids, ['est_affecte' => true]);

            $colonnes[]        = $col;
            $inscritsRow[$col] = $ins;
            $affectesRow[$col] = $aff;
            $totIns[0] += $ins[0]; $totIns[1] += $ins[1];
            $totAff[0] += $aff[0]; $totAff[1] += $aff[1];
        }

        return [
            'colonnes' => $colonnes,
            'lignes'   => [$inscritsRow, $affectesRow],
            'total'    => ['inscrits' => $totIns, 'affectes' => $totAff],
        ];
    }

    // --- S8 : Âges 1er cycle -------------------------------------------------

    private function s8_ages1c(array $premierCycle, ?array $filterIds = null): array
    {
        $tranches = [
            'Moins de 12 ans' => fn($a) => $a < 12,
            '12 ans'          => fn($a) => $a === 12,
            '13 ans'          => fn($a) => $a === 13,
            '14 ans'          => fn($a) => $a === 14,
            '15 ans'          => fn($a) => $a === 15,
            '16 ans'          => fn($a) => $a === 16,
            '17 ans et plus'  => fn($a) => $a >= 17,
        ];

        $colonnes = array_map(fn($i) => [
            'label'   => $i['niveau']->abbr_niveau,
            'classes' => $i['classes'],
        ], $premierCycle);

        return $this->buildAgesTable($colonnes, $tranches, $filterIds);
    }

    // --- S9 : Redoublants par âge 1er cycle ----------------------------------

    private function s9_redoublantsAges1c(array $premierCycle, array $redoublantIds): array
    {
        return $this->s8_ages1c($premierCycle, $redoublantIds);
    }

    // --- S10 : Âges 2nd cycle ------------------------------------------------

    private function s10_ages2c(array $secondCycle, ?array $filterIds = null): array
    {
        $tranches = [
            'Moins de 16 ans' => fn($a) => $a < 16,
            '16 ans'          => fn($a) => $a === 16,
            '17 ans'          => fn($a) => $a === 17,
            '18 ans'          => fn($a) => $a === 18,
            '19 ans et plus'  => fn($a) => $a >= 19,
        ];

        return $this->buildAgesTable($this->colonnes2c($secondCycle), $tranches, $filterIds);
    }

    // --- S11 : Redoublants par âge 2nd cycle ---------------------------------

    private function s11_redoublantsAges2c(array $secondCycle, array $redoublantIds): array
    {
        return $this->s10_ages2c($secondCycle, $redoublantIds);
    }

    private function buildAgesTable(array $colonnes, array $tranches, ?array $filterIds): array
    {
        $refYear = now()->year;
        $result  = [];

        foreach ($tranches as $label => $check) {
            $row = ['tranche' => $label];
            $tot = [0, 0];

            foreach ($colonnes as $col) {
                $q = DB::table('eleves')
                    ->whereIn('classe_id', $col['classes'])
                    ->whereNotNull('date_naissance_eleve');
                if ($filterIds !== null) $q->whereIn('id', $filterIds ?: [-1]);

                $eleves = $q->select('genre_eleve', 'date_naissance_eleve')->get();
                $total = $filles = 0;
                foreach ($eleves as $e) {
                    $age = $refYear - (int) substr($e->date_naissance_eleve, 0, 4);
                    if ($check($age)) {
                        $total++;
                        if ($e->genre_eleve === 'F') $filles++;
                    }
                }
                $row[$col['label']] = [$total, $filles];
                $tot[0] += $total; $tot[1] += $filles;
            }

            $row['total'] = $tot;
            $result[]     = $row;
        }

        // Ligne TOTAL
        $totRow = ['tranche' => 'TOTAL'];
        $gt     = [0, 0];
        foreach ($colonnes as $col) {
            $q = DB::table('eleves')->whereIn('classe_id', $col['classes']);
            if ($filterIds !== null) $q->whereIn('id', $filterIds ?: [-1]);
            $t = $q->count();
            $f = (clone $q)->where('genre_eleve', 'F')->count();
            $totRow[$col['label']] = [$t, $f];
            $gt[0] += $t; $gt[1] += $f;
        }
        $totRow['total'] = $gt;
        $result[]        = $totRow;

        return [
            'colonnes' => array_column($colonnes, 'label'),
            'lignes'   => $result,
        ];
    }

    // --- S12 : Résultats examens ---------------------------------------------

    private function s12_examens(int $anneeId): array
    {
        $rows        = ResultatExamen::where('annee_scolaire_id', $anneeId)->get();
        $bepcDefault = $this->effInNiveaux(['3ème']);
        $bacDefault  = $this->effInNiveaux(['Tle']);

        $result = [];
        foreach (['bepc' => $bepcDefault, 'bac' => $bacDefault] as $type => $def) {
            $r             = $rows->firstWhere('type_examen', $type);
            $result[$type] = [
                'inscrits'  => $r ? [$r->nb_inscrits,  $r->nb_inscrits_filles]  : $def,
                'presentes' => $r ? [$r->nb_presentes, $r->nb_presentes_filles] : [0, 0],
                'admis'     => $r ? [$r->nb_admis,     $r->nb_admis_filles]     : [0, 0],
            ];
        }
        return $result;
    }

    private function effInNiveaux(array $abbrNiveaux): array
    {
        $ids = Classe::whereHas('niveau', fn($q) => $q->whereIn('abbr_niveau', $abbrNiveaux))
            ->pluck('id')->toArray();
        return $this->eff($ids);
    }

    // --- S13 : Décisions fin d'année -----------------------------------------

    private function s13_decisions(?int $periodeId, int $anneeId): array
    {
        $niveaux = Niveau::orderBy('ordre')->get();
        $lignes  = [];
        $tot     = ['inscrits'=>[0,0],'admis'=>[0,0],'redoublants'=>[0,0],'exclus'=>[0,0],'abandons'=>[0,0],'deces'=>[0,0]];

        $admisDecisions = ['admis_felicitations','admis_encouragements','admis','passage_conditionnel'];

        foreach ($niveaux as $niveau) {
            $cids = Classe::where('niveau_id', $niveau->id)->pluck('id')->toArray();
            if (empty($cids)) continue;

            $eleveIds = DB::table('eleves')->whereIn('classe_id', $cids)->pluck('id');

            $inscrits   = $this->eff($cids);
            $abandons   = $this->eff($cids, ['statut_eleve' => 'abandon']);
            $deces      = $this->eff($cids, ['statut_eleve' => 'decede']);
            $admis      = [0, 0];
            $redoublants = [0, 0];
            $exclus     = [0, 0];

            if ($periodeId && $eleveIds->isNotEmpty()) {
                $base = fn($decisions) => DB::table('decisions_conseil as dc')
                    ->join('eleves as e', 'dc.eleve_id', '=', 'e.id')
                    ->whereIn('dc.eleve_id', $eleveIds)
                    ->where('dc.periode_id', $periodeId)
                    ->whereIn('dc.decision', (array) $decisions);

                $qA = $base($admisDecisions);
                $admis = [$qA->count(), (clone $qA)->where('e.genre_eleve','F')->count()];

                $qR = $base(['redoublement']);
                $redoublants = [$qR->count(), (clone $qR)->where('e.genre_eleve','F')->count()];

                $qE = $base(['exclu']);
                $exclus = [$qE->count(), (clone $qE)->where('e.genre_eleve','F')->count()];
            }

            $lignes[] = [
                'niveau'      => $niveau->abbr_niveau,
                'inscrits'    => $inscrits,
                'admis'       => $admis,
                'redoublants' => $redoublants,
                'exclus'      => $exclus,
                'abandons'    => $abandons,
                'deces'       => $deces,
            ];

            foreach (['inscrits','admis','redoublants','exclus','abandons','deces'] as $k) {
                $tot[$k][0] += $$k[0]; $tot[$k][1] += $$k[1];
            }
        }

        return ['lignes' => $lignes, 'total' => $tot];
    }

    // --- S14 : Handicapés / Orphelins ----------------------------------------

    private function s14_vulnerables(): array
    {
        $niveaux  = Niveau::orderBy('ordre')->get();
        $abbrs    = $niveaux->pluck('abbr_niveau')->toArray();
        $handicaps = ['moteur','malvoyant','malentendant','albinisme','nanisme','begayement','autiste'];
        $orphelins = ['pere' => 'De père', 'mere' => 'De mère', 'les_deux' => 'Des 2 parents'];
        $result   = ['niveaux' => $abbrs, 'handicaps' => [], 'orphelins' => []];

        foreach ($handicaps as $type) {
            $row = ['type' => ucfirst(str_replace('_', ' ', $type))];
            $tot = [0, 0];

            foreach ($niveaux as $n) {
                $cids = Classe::where('niveau_id', $n->id)->pluck('id')->toArray();
                $eff  = $this->effClosure($cids, fn($q) => $q->whereJsonContains('types_handicap', $type));
                $row[$n->abbr_niveau] = $eff;
                $tot[0] += $eff[0]; $tot[1] += $eff[1];
            }

            $row['total']       = $tot;
            $result['handicaps'][] = $row;
        }

        foreach ($orphelins as $type => $label) {
            $row = ['type' => $label];
            $tot = [0, 0];

            foreach ($niveaux as $n) {
                $cids = Classe::where('niveau_id', $n->id)->pluck('id')->toArray();
                $eff  = $this->eff($cids, ['statut_orphelin' => $type]);
                $row[$n->abbr_niveau] = $eff;
                $tot[0] += $eff[0]; $tot[1] += $eff[1];
            }

            $row['total']        = $tot;
            $result['orphelins'][] = $row;
        }

        return $result;
    }

    // =========================================================================
    // AGRÉGATION PRINCIPALE
    // =========================================================================

    private function agregat(AnneeScolaire $annee): array
    {
        [$pc, $sc]    = $this->detectCycles();
        $redIds       = $this->redoublantIds($annee);
        $periodeId    = $this->dernierePeriodeId($annee->id);

        return [
            'annee'                => $annee,
            's1_groupes_pedago'    => $this->s1_groupesPedago($pc),
            's2_effectifs_bours'   => $this->s2_effectifsBoursiers($pc),
            's3_langues'           => $this->s3_langues($pc),
            's4_nats_1c'           => $this->s4_nationalites1c($pc),
            's5_nats_2c'           => $this->s5_nationalites2c($sc),
            's6_affectes_1c'       => $this->s6_affectes1c($pc),
            's7_affectes_2c'       => $this->s7_affectes2c($sc),
            's8_ages_1c'           => $this->s8_ages1c($pc),
            's9_redoub_ages_1c'    => $this->s9_redoublantsAges1c($pc, $redIds),
            's10_ages_2c'          => $this->s10_ages2c($sc),
            's11_redoub_ages_2c'   => $this->s11_redoublantsAges2c($sc, $redIds),
            's12_examens'          => $this->s12_examens($annee->id),
            's13_decisions'        => $this->s13_decisions($periodeId, $annee->id),
            's14_vulnerables'      => $this->s14_vulnerables(),
        ];
    }

    // =========================================================================
    // ENDPOINTS
    // =========================================================================

    public function donnees(Request $request)
    {
        $annee = $this->annee($request);
        return response()->json($this->agregat($annee));
    }

    // =========================================================================
    // EXPORT EXCEL
    // =========================================================================

    public function exportExcel(Request $request)
    {
        ini_set('memory_limit', '512M');
        $annee = $this->annee($request);
        $data  = $this->agregat($annee);

        $wb = new Spreadsheet();
        $wb->removeSheetByIndex(0);

        $this->excelS1($wb, $data);
        $this->excelS2($wb, $data);
        $this->excelS3($wb, $data);
        $this->excelS4_5($wb, $data);
        $this->excelS6_7($wb, $data);
        $this->excelS8_9($wb, $data);
        $this->excelS10_11($wb, $data);
        $this->excelS12($wb, $data);
        $this->excelS13($wb, $data);
        $this->excelS14($wb, $data);

        $writer   = new Xlsx($wb);
        $filename = 'stats_generales_' . $annee->libelle . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // ── Styles Excel ─────────────────────────────────────────────────────────

    private function addSheet(Spreadsheet $wb, string $title): \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet
    {
        $ws = new \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet($wb, $title);
        $wb->addSheet($ws);
        return $ws;
    }

    private function styleHeader(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E79']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
    }

    private function styleSubHeader(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
    }

    private function styleData(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
    }

    private function styleTotal(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFF2CC']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
    }

    /** Écrit [total, filles] dans deux cellules adjacentes */
    private function writePair(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $ws, int $row, int $col, array $pair): void
    {
        $ws->setCellValue([$col, $row], $pair[0]);
        $ws->setCellValue([$col + 1, $row], $pair[1]);
    }

    // ── Feuilles Excel ────────────────────────────────────────────────────────

    private function excelS1(Spreadsheet $wb, array $data): void
    {
        $ws  = $this->addSheet($wb, 'Groupes pédagogiques');
        $s   = $data['s1_groupes_pedago'];
        $nbs = count($s['lignes']);

        $ws->mergeCells('A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(2 + $nbs * 2) . '1');
        $ws->setCellValue('A1', 'RÉPARTITION DES GROUPES PÉDAGOGIQUES PAR NIVEAU — 1ER CYCLE');
        $this->styleHeader($ws, 'A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(2 + $nbs * 2) . '1');

        $col = 2;
        foreach ($s['lignes'] as $ligne) {
            $ws->mergeCells(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . '2:' .
                            \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1) . '2');
            $ws->setCellValue([$col, 2], $ligne['niveau']);
            $col += 2;
        }
        $ws->setCellValue('A3', 'Indicateur');
        $ws->setCellValue([$col, 2], 'TOTAL');

        $ws->setCellValue('A4', 'Groupes pédagogiques');
        $ws->setCellValue('A5', 'Salles physiques');

        $col = 2;
        foreach ($s['lignes'] as $ligne) {
            $ws->setCellValue([$col, 4], $ligne['groupes']);
            $ws->setCellValue([$col, 5], $ligne['salles']);
            $col += 2;
        }
        $ws->setCellValue([$col, 4], $s['total']['groupes']);
        $ws->setCellValue([$col, 5], $s['total']['salles']);

        $this->styleSubHeader($ws, 'A2:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . '3');
        $this->styleData($ws, 'A4:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . '5');
        $ws->getColumnDimension('A')->setWidth(30);
    }

    private function excelS2(Spreadsheet $wb, array $data): void
    {
        $ws   = $this->addSheet($wb, 'Effectifs et boursiers');
        $s    = $data['s2_effectifs_bours'];
        $nbs  = count($s['lignes']);
        $last = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(1 + ($nbs + 1) * 2);

        $ws->mergeCells('A1:' . $last . '1');
        $ws->setCellValue('A1', 'RÉPARTITION DES ÉLÈVES PAR NIVEAU ET ÉTAT DES BOURSIERS — 1ER CYCLE');
        $this->styleHeader($ws, 'A1:' . $last . '1');

        // En-têtes niveaux
        $col = 2;
        foreach ($s['lignes'] as $l) {
            $nCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
            $nCol2 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
            $ws->mergeCells("{$nCol}2:{$nCol2}2");
            $ws->setCellValue([$col, 2], $l['niveau']);
            $ws->setCellValue([$col, 3], 'Total');
            $ws->setCellValue([$col + 1, 3], 'Filles');
            $col += 2;
        }
        $ws->mergeCells(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . '2:' .
                        \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1) . '2');
        $ws->setCellValue([$col, 2], 'TOTAL');
        $ws->setCellValue([$col, 3], 'Total');
        $ws->setCellValue([$col + 1, 3], 'Filles');
        $ws->setCellValue('A2', '');
        $ws->setCellValue('A3', 'Rubrique');

        $rows = [
            ['label' => 'Effectif',        'key' => 'effectif'],
            ['label' => "Dont affectés",   'key' => 'affectes'],
            ['label' => 'Dont boursier',   'key' => 'boursiers'],
            ['label' => 'Dont demi-bours.','key' => 'demi_boursiers'],
        ];

        foreach ($rows as $ri => $r) {
            $rowNum = 4 + $ri;
            $ws->setCellValue('A' . $rowNum, $r['label']);
            $col = 2;
            foreach ($s['lignes'] as $l) {
                $this->writePair($ws, $rowNum, $col, $l[$r['key']]);
                $col += 2;
            }
            $this->writePair($ws, $rowNum, $col, $s['total'][$r['key']]);
        }

        $dataRange = 'A2:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1) . (3 + count($rows));
        $this->styleSubHeader($ws, 'A2:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1) . '3');
        $this->styleData($ws, 'A4:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1) . (3 + count($rows)));
        $ws->getColumnDimension('A')->setWidth(28);
    }

    private function excelS3(Spreadsheet $wb, array $data): void
    {
        $ws     = $this->addSheet($wb, 'Langues');
        $lignes = $data['s3_langues'];
        if (empty($lignes)) return;

        $niveaux = array_keys(array_filter($lignes[0], fn($v) => is_array($v) && isset($v[0])));
        $niveaux = array_filter($niveaux, fn($k) => $k !== 'total');

        $ws->setCellValue('A1', 'RÉPARTITION DES ÉLÈVES PAR LANGUE — 1ER CYCLE');
        $ws->setCellValue('A3', 'Langue 2');

        $col = 2;
        foreach ($niveaux as $niv) {
            $ws->setCellValue([$col, 2], $niv);
            $ws->setCellValue([$col, 3], 'Total');
            $ws->setCellValue([$col + 1, 3], 'Filles');
            $col += 2;
        }
        $ws->setCellValue([$col, 2], 'TOTAL');
        $ws->setCellValue([$col, 3], 'Total');
        $ws->setCellValue([$col + 1, 3], 'Filles');

        foreach ($lignes as $ri => $r) {
            $row = 4 + $ri;
            $ws->setCellValue('A' . $row, $r['langue']);
            $col = 2;
            foreach ($niveaux as $niv) {
                $this->writePair($ws, $row, $col, $r[$niv] ?? [0, 0]);
                $col += 2;
            }
            $this->writePair($ws, $row, $col, $r['total']);
        }

        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
        $lastRow = 3 + count($lignes);
        $this->styleHeader($ws, "A1:{$lastCol}1");
        $this->styleSubHeader($ws, "A2:{$lastCol}3");
        $this->styleData($ws, "A4:{$lastCol}{$lastRow}");
        $ws->getColumnDimension('A')->setWidth(18);
    }

    private function excelS4_5(Spreadsheet $wb, array $data): void
    {
        $this->excelNationalites($wb, 'Nationalités 1er cycle', $data['s4_nats_1c'], false);
        $s5 = $data['s5_nats_2c'];
        if (!empty($s5['lignes'])) {
            $this->excelNationalites($wb, 'Nationalités 2nd cycle', $s5['lignes'], true, $s5['colonnes'] ?? []);
        }
    }

    private function excelNationalites(Spreadsheet $wb, string $title, array $lignes, bool $is2c, array $cols2c = []): void
    {
        $ws = $this->addSheet($wb, $title);
        if (empty($lignes)) return;

        $headers = $is2c ? $cols2c : array_keys(array_filter($lignes[0] ?? [], fn($v) => is_array($v) && isset($v[0]) && $v !== $lignes[0]['total'] ?? []));

        $ws->setCellValue('A1', strtoupper($title));
        $ws->setCellValue('A3', 'Nationalité');

        $col = 2;
        foreach ($headers as $h) {
            if ($h === 'total') continue;
            $ws->setCellValue([$col, 2], $h);
            $ws->setCellValue([$col, 3], 'Total');
            $ws->setCellValue([$col + 1, 3], 'Filles');
            $col += 2;
        }
        $ws->setCellValue([$col, 2], 'TOTAL');
        $ws->setCellValue([$col, 3], 'Total');
        $ws->setCellValue([$col + 1, 3], 'Filles');

        foreach ($lignes as $ri => $r) {
            $row = 4 + $ri;
            $ws->setCellValue('A' . $row, $r['nationalite']);
            $col = 2;
            foreach ($headers as $h) {
                if ($h === 'total') continue;
                $this->writePair($ws, $row, $col, $r[$h] ?? [0, 0]);
                $col += 2;
            }
            $this->writePair($ws, $row, $col, $r['total'] ?? [0, 0]);
        }

        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
        $lastRow = 3 + count($lignes);
        $this->styleHeader($ws, "A1:{$lastCol}1");
        $this->styleSubHeader($ws, "A2:{$lastCol}3");
        $this->styleData($ws, "A4:{$lastCol}{$lastRow}");
        $ws->getColumnDimension('A')->setWidth(28);
    }

    private function excelS6_7(Spreadsheet $wb, array $data): void
    {
        foreach ([
            ['Affectés 1er cycle', $data['s6_affectes_1c']],
            ['Affectés 2nd cycle', $data['s7_affectes_2c']],
        ] as [$title, $s]) {
            if (empty($s['colonnes'])) continue;
            $ws  = $this->addSheet($wb, $title);
            $col = 2;

            $ws->setCellValue('A1', strtoupper($title));
            $ws->setCellValue('A3', 'Rubrique');

            foreach ($s['colonnes'] as $c) {
                $ws->setCellValue([$col, 2], $c);
                $ws->setCellValue([$col, 3], 'Total');
                $ws->setCellValue([$col + 1, 3], 'Filles');
                $col += 2;
            }
            $ws->setCellValue([$col, 2], 'TOTAL');
            $ws->setCellValue([$col, 3], 'Total');
            $ws->setCellValue([$col + 1, 3], 'Filles');

            foreach ($s['lignes'] as $ri => $r) {
                $row = 4 + $ri;
                $ws->setCellValue('A' . $row, $r['rubrique']);
                $c2  = 2;
                foreach ($s['colonnes'] as $cn) {
                    $this->writePair($ws, $row, $c2, $r[$cn] ?? [0, 0]);
                    $c2 += 2;
                }
                $totKey = $ri === 0 ? 'inscrits' : 'affectes';
                $this->writePair($ws, $row, $c2, $s['total'][$totKey]);
            }

            $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
            $lastRow = 3 + count($s['lignes']);
            $this->styleHeader($ws, "A1:{$lastCol}1");
            $this->styleSubHeader($ws, "A2:{$lastCol}3");
            $this->styleData($ws, "A4:{$lastCol}{$lastRow}");
            $ws->getColumnDimension('A')->setWidth(28);
        }
    }

    private function excelS8_9(Spreadsheet $wb, array $data): void
    {
        $this->excelAges($wb, 'Âges 1er cycle', $data['s8_ages_1c']['lignes']);
        $this->excelAges($wb, 'Redoublants âges 1C', $data['s9_redoub_ages_1c']['lignes']);
    }

    private function excelS10_11(Spreadsheet $wb, array $data): void
    {
        $this->excelAges($wb, 'Âges 2nd cycle', $data['s10_ages_2c']['lignes']);
        $this->excelAges($wb, 'Redoublants âges 2C', $data['s11_redoub_ages_2c']['lignes']);
    }

    private function excelAges(Spreadsheet $wb, string $title, array $lignes): void
    {
        $ws = $this->addSheet($wb, $title);
        if (empty($lignes)) return;

        $colonnes = array_keys(array_filter($lignes[0], fn($k) => $k !== 'tranche' && $k !== 'total', ARRAY_FILTER_USE_KEY));

        $ws->setCellValue('A1', strtoupper($title));
        $ws->setCellValue('A3', 'Tranche d\'âge');

        $col = 2;
        foreach ($colonnes as $c) {
            $ws->setCellValue([$col, 2], $c);
            $ws->setCellValue([$col, 3], 'Total');
            $ws->setCellValue([$col + 1, 3], 'Filles');
            $col += 2;
        }
        $ws->setCellValue([$col, 2], 'TOTAL');
        $ws->setCellValue([$col, 3], 'Total');
        $ws->setCellValue([$col + 1, 3], 'Filles');

        foreach ($lignes as $ri => $r) {
            $row = 4 + $ri;
            $ws->setCellValue('A' . $row, $r['tranche']);
            $col = 2;
            foreach ($colonnes as $c) {
                $this->writePair($ws, $row, $col, $r[$c] ?? [0, 0]);
                $col += 2;
            }
            $this->writePair($ws, $row, $col, $r['total']);
        }

        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
        $lastRow = 3 + count($lignes);
        $this->styleHeader($ws, "A1:{$lastCol}1");
        $this->styleSubHeader($ws, "A2:{$lastCol}3");
        $this->styleData($ws, "A4:{$lastCol}" . ($lastRow - 1));
        $this->styleTotal($ws, "A{$lastRow}:{$lastCol}{$lastRow}");
        $ws->getColumnDimension('A')->setWidth(22);
    }

    private function excelS12(Spreadsheet $wb, array $data): void
    {
        $ws = $this->addSheet($wb, 'Résultats examens');
        $s  = $data['s12_examens'];

        $ws->setCellValue('A1', 'RÉSULTATS AUX EXAMENS');
        $headers = ['A3' => 'Examen', 'B2' => 'Inscrits', 'D2' => 'Présentés', 'F2' => 'Admis'];
        foreach ($headers as $cell => $val) $ws->setCellValue($cell, $val);
        foreach (['B3' => 'Total', 'C3' => 'Filles', 'D3' => 'Total', 'E3' => 'Filles', 'F3' => 'Total', 'G3' => 'Filles'] as $c => $v) {
            $ws->setCellValue($c, $v);
        }

        $row = 4;
        foreach (['BEPC' => 'bepc', 'BAC' => 'bac'] as $label => $key) {
            $ws->setCellValue('A' . $row, $label);
            $r = $s[$key];
            $this->writePair($ws, $row, 2, $r['inscrits']);
            $this->writePair($ws, $row, 4, $r['presentes']);
            $this->writePair($ws, $row, 6, $r['admis']);
            $row++;
        }

        $this->styleHeader($ws, 'A1:G1');
        $this->styleSubHeader($ws, 'A2:G3');
        $this->styleData($ws, 'A4:G5');
        $ws->getColumnDimension('A')->setWidth(12);
    }

    private function excelS13(Spreadsheet $wb, array $data): void
    {
        $ws = $this->addSheet($wb, 'Décisions fin d\'année');
        $s  = $data['s13_decisions'];

        $ws->setCellValue('A1', 'DÉCISIONS DE FIN D\'ANNÉE');
        $ws->setCellValue('A3', 'Niveau');

        $cols = [
            'B' => 'Inscrits', 'D' => 'Admis', 'F' => 'Redoublants',
            'H' => 'Exclus',   'J' => 'Abandons', 'L' => 'Décès',
        ];
        $dataKeys = ['inscrits','admis','redoublants','exclus','abandons','deces'];

        $ci = 2;
        foreach ($cols as $colLetter => $label) {
            $ws->setCellValue([$ci, 2], $label);
            $ws->setCellValue([$ci, 3], 'Total');
            $ws->setCellValue([$ci + 1, 3], 'Filles');
            $ci += 2;
        }

        foreach ($s['lignes'] as $ri => $r) {
            $row = 4 + $ri;
            $ws->setCellValue('A' . $row, $r['niveau']);
            $col = 2;
            foreach ($dataKeys as $k) {
                $this->writePair($ws, $row, $col, $r[$k]);
                $col += 2;
            }
        }

        $totRow = 4 + count($s['lignes']);
        $ws->setCellValue('A' . $totRow, 'TOTAL');
        $col = 2;
        foreach ($dataKeys as $k) {
            $this->writePair($ws, $totRow, $col, $s['total'][$k]);
            $col += 2;
        }

        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col - 1);
        $this->styleHeader($ws, "A1:{$lastCol}1");
        $this->styleSubHeader($ws, "A2:{$lastCol}3");
        $this->styleData($ws, "A4:{$lastCol}" . ($totRow - 1));
        $this->styleTotal($ws, "A{$totRow}:{$lastCol}{$totRow}");
        $ws->getColumnDimension('A')->setWidth(12);
    }

    private function excelS14(Spreadsheet $wb, array $data): void
    {
        $ws      = $this->addSheet($wb, 'Handicapés et orphelins');
        $s       = $data['s14_vulnerables'];
        $niveaux = $s['niveaux'];

        $ws->setCellValue('A1', 'ENFANTS HANDICAPÉS, ORPHELINS ET VULNÉRABLES');
        $ws->setCellValue('A3', 'Catégorie');
        $ws->setCellValue('B3', 'Type');

        $col = 3;
        foreach ($niveaux as $niv) {
            $ws->setCellValue([$col, 2], $niv);
            $ws->setCellValue([$col, 3], 'Total');
            $ws->setCellValue([$col + 1, 3], 'Filles');
            $col += 2;
        }
        $ws->setCellValue([$col, 2], 'TOTAL');
        $ws->setCellValue([$col, 3], 'Total');
        $ws->setCellValue([$col + 1, 3], 'Filles');

        $row = 4;
        $handicapStart = $row;
        foreach ($s['handicaps'] as $ri => $r) {
            if ($ri === 0) $ws->setCellValue('A' . $row, 'HANDICAPÉS');
            $ws->setCellValue('B' . $row, $r['type']);
            $col = 3;
            foreach ($niveaux as $niv) {
                $this->writePair($ws, $row, $col, $r[$niv] ?? [0, 0]);
                $col += 2;
            }
            $this->writePair($ws, $row, $col, $r['total']);
            $row++;
        }

        foreach ($s['orphelins'] as $ri => $r) {
            if ($ri === 0) $ws->setCellValue('A' . $row, 'ORPHELINS');
            $ws->setCellValue('B' . $row, $r['type']);
            $col = 3;
            foreach ($niveaux as $niv) {
                $this->writePair($ws, $row, $col, $r[$niv] ?? [0, 0]);
                $col += 2;
            }
            $this->writePair($ws, $row, $col, $r['total']);
            $row++;
        }

        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
        $this->styleHeader($ws, "A1:{$lastCol}1");
        $this->styleSubHeader($ws, "A2:{$lastCol}3");
        $this->styleData($ws, "A4:{$lastCol}" . ($row - 1));
        $ws->getColumnDimension('A')->setWidth(18);
        $ws->getColumnDimension('B')->setWidth(22);
    }

    // =========================================================================
    // EXPORT PDF
    // =========================================================================

    public function exportPdf(Request $request)
    {
        ini_set('memory_limit', '512M');
        set_time_limit(300);

        $annee = $this->annee($request);
        $data  = $this->agregat($annee);

        $pdf = Pdf::loadView('stats.generales_pdf', [
            'annee' => $annee->libelle,
            'data'  => $data,
        ])->setPaper('A4', 'landscape');

        return $pdf->download('stats_generales_' . $annee->libelle . '.pdf');
    }

    // =========================================================================
    // GESTION RÉSULTATS EXAMENS (saisie)
    // =========================================================================

    public function upsertExamen(Request $request)
    {
        $request->validate([
            'annee_scolaire_id'   => 'required|exists:annees_scolaires,id',
            'type_examen'         => 'required|in:bepc,bac',
            'nb_inscrits'         => 'required|integer|min:0',
            'nb_inscrits_filles'  => 'required|integer|min:0',
            'nb_presentes'        => 'required|integer|min:0',
            'nb_presentes_filles' => 'required|integer|min:0',
            'nb_admis'            => 'required|integer|min:0',
            'nb_admis_filles'     => 'required|integer|min:0',
        ]);

        $r = ResultatExamen::updateOrCreate(
            ['annee_scolaire_id' => $request->annee_scolaire_id, 'type_examen' => $request->type_examen],
            $request->only(['nb_inscrits','nb_inscrits_filles','nb_presentes','nb_presentes_filles','nb_admis','nb_admis_filles'])
        );

        return response()->json($r);
    }
}
