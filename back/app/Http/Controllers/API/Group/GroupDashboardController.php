<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\Group;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupDashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $group   = $request->user()->group;
        $tenants = $group->tenants()->with('domains')->where('actif', true)->get();

        // ?mois=2026-04 → filtre mois | absent = toutes périodes
        $mois = $request->query('mois');
        if ($mois) {
            [$annee, $moisNum] = explode('-', $mois);
        }

        $debutSemaine = Carbon::now()->startOfWeek()->toDateString();

        $consolidé = [];

        foreach ($tenants as $tenant) {
            tenancy()->initialize($tenant);

            // ── Effectifs ────────────────────────────────────────────────────
            $totalEleves      = (int) \DB::table('eleves')->count();
            $totalEnseignants = (int) \DB::table('enseignants')->count();
            $totalClasses     = (int) \DB::table('classes')->count();
            $totalParents     = (int) \DB::table('parents')->count();

            // ── Finances ─────────────────────────────────────────────────────
            $totalDu = (float) \DB::table('scolarites')
                ->join('classes', 'classes.niveau_id', '=', 'scolarites.niveau_id')
                ->join('eleves', 'eleves.classe_id', '=', 'classes.id')
                ->sum('scolarites.montant_echeance');

            $qPaiements = \DB::table('paiements');
            if ($mois) {
                $qPaiements->whereYear('created_at', $annee)->whereMonth('created_at', $moisNum);
            }
            $totalEncaisse = (float) (clone $qPaiements)->sum('montant_paye');
            $totalEncaisseGlobal = (float) \DB::table('paiements')->sum('montant_paye');

            $tauxRecouvrement = $totalDu > 0 ? round(($totalEncaisseGlobal / $totalDu) * 100, 1) : 0;
            $impayes          = max(0, $totalDu - $totalEncaisseGlobal);

            // Élèves à jour / en retard
            $dusParNiveau = \DB::table('scolarites')
                ->select('niveau_id', \DB::raw('sum(montant_echeance) as total_du'))
                ->groupBy('niveau_id')
                ->pluck('total_du', 'niveau_id');

            $niveauParEleve = \DB::table('eleves')
                ->join('classes', 'eleves.classe_id', '=', 'classes.id')
                ->pluck('classes.niveau_id', 'eleves.id');

            $paiementsParEleve = \DB::table('paiements')
                ->select('eleve_id', \DB::raw('sum(montant_paye) as total_paye'))
                ->groupBy('eleve_id')
                ->pluck('total_paye', 'eleve_id');

            $elevesAJour = $elevesEnRetard = 0;
            foreach ($niveauParEleve as $eleveId => $niveauId) {
                $du   = (float) ($dusParNiveau[$niveauId] ?? 0);
                $paye = (float) ($paiementsParEleve[$eleveId] ?? 0);
                if ($paye >= $du) $elevesAJour++; else $elevesEnRetard++;
            }

            // ── Assiduités ───────────────────────────────────────────────────
            $qAbsences = \DB::table('assiduites')->where('statut', 'absent');
            $qRetards  = \DB::table('assiduites')->where('statut', 'retard');
            if ($mois) {
                $qAbsences->whereYear('date_assiduite', $annee)->whereMonth('date_assiduite', $moisNum);
                $qRetards->whereYear('date_assiduite', $annee)->whereMonth('date_assiduite', $moisNum);
            }
            $totalAbsences = (int) (clone $qAbsences)->count();
            $totalRetards  = (int) (clone $qRetards)->count();

            // ── Pédagogie ────────────────────────────────────────────────────
            $totalDevoirs     = (int) \DB::table('devoirs')->count();
            $devoirsAvecNotes = (int) \DB::table('devoirs')
                ->whereExists(fn($q) => $q->from('notes')->whereColumn('notes.devoir_id', 'devoirs.id'))
                ->count();
            $tauxSaisieNotes = $totalDevoirs > 0 ? round(($devoirsAvecNotes / $totalDevoirs) * 100, 1) : 0;

            $consolidé[] = [
                'id'      => $tenant->id,
                'nom'     => $tenant->nom,
                'ville'   => $tenant->ville,
                'domaine' => $tenant->domains->first()?->domain,
                'stats'   => compact(
                    'totalEleves', 'totalEnseignants', 'totalClasses', 'totalParents',
                    'totalDu', 'totalEncaisse', 'tauxRecouvrement', 'impayes',
                    'elevesAJour', 'elevesEnRetard',
                    'totalAbsences', 'totalRetards',
                    'totalDevoirs', 'devoirsAvecNotes', 'tauxSaisieNotes'
                ),
            ];

            tenancy()->end();
        }

        $s = array_column($consolidé, 'stats');

        $totalDevoirs       = array_sum(array_column($s, 'totalDevoirs'));
        $devoirsAvecNotes   = array_sum(array_column($s, 'devoirsAvecNotes'));
        $totalDuGlobal      = array_sum(array_column($s, 'totalDu'));
        $totalEncaisseGlobal = array_sum(array_column($s, 'totalEncaisse'));

        $totaux = [
            'ecoles'             => count($consolidé),
            'eleves'             => array_sum(array_column($s, 'totalEleves')),
            'enseignants'        => array_sum(array_column($s, 'totalEnseignants')),
            'classes'            => array_sum(array_column($s, 'totalClasses')),
            'parents'            => array_sum(array_column($s, 'totalParents')),
            'total_du'           => $totalDuGlobal,
            'total_encaisse'     => $totalEncaisseGlobal,
            'impayes'            => array_sum(array_column($s, 'impayes')),
            'eleves_a_jour'      => array_sum(array_column($s, 'elevesAJour')),
            'eleves_en_retard'   => array_sum(array_column($s, 'elevesEnRetard')),
            'absences'           => array_sum(array_column($s, 'totalAbsences')),
            'retards'            => array_sum(array_column($s, 'totalRetards')),
            'devoirs'            => $totalDevoirs,
            'taux_saisie_notes'  => $totalDevoirs > 0 ? round(($devoirsAvecNotes / $totalDevoirs) * 100, 1) : 0,
        ];

        $totaux['taux_recouvrement'] = $totalDuGlobal > 0
            ? round(($totalEncaisseGlobal / $totalDuGlobal) * 100, 1)
            : 0;

        return response()->json([
            'groupe'  => ['id' => $group->id, 'nom' => $group->nom],
            'mois'    => $mois,
            'totaux'  => $totaux,
            'ecoles'  => $consolidé,
        ]);
    }
}
