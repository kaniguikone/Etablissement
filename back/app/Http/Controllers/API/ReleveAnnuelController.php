<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\Note;
use App\Models\Periodes;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;

class ReleveAnnuelController extends Controller
{
    /**
     * GET /releve-annuel/{eleveId}/{annee}
     * Génère le relevé de notes annuel (toutes périodes de l'année) pour un élève.
     */
    public function telecharger(string $eleveId, string $annee)
    {
        $eleve    = Eleve::with('classe.niveau')->findOrFail($eleveId);
        $periodes = Periodes::where('annee', $annee)->orderBy('id')->get();

        if ($periodes->isEmpty()) {
            abort(404, "Aucune période pour l'année scolaire {$annee}.");
        }

        $niveauId = $eleve->classe?->niveau_id;
        $serieId  = $eleve->classe?->serie_id;
        $coefficients = $this->coefficientsMatiere($niveauId, $serieId);

        // Calcul des moyennes par période et par matière
        $periodeIds = $periodes->pluck('id')->toArray();

        $notes = Note::with(['devoir.matiere'])
            ->whereHas('devoir', function ($q) use ($periodeIds, $eleve, $niveauId) {
                $q->whereIn('periode_id', $periodeIds)
                  ->where(function ($q2) use ($eleve, $niveauId) {
                      $q2->where('classe_id', $eleve->classe_id)
                         ->orWhere('niveau_id', $niveauId);
                  });
            })
            ->where('eleve_id', $eleveId)
            ->get()
            ->groupBy(fn($n) => (string) $n->devoir->periode_id);

        // Par matière : [libelle => [coeff, par_periode => [periode_id => moyenne], moyenne_annuelle]]
        $toutesLesMatieres = $notes->flatMap(fn($g) => $g->pluck('devoir.matiere.libelle_matiere'))->unique();

        $parMatiere = collect();
        foreach ($toutesLesMatieres as $libelle) {
            $matiereId    = null;
            $parPeriode   = [];

            foreach ($periodes as $p) {
                $notesP = $notes->get((string) $p->id, collect())
                    ->filter(fn($n) => $n->devoir->matiere->libelle_matiere === $libelle);

                if ($notesP->isEmpty()) {
                    $parPeriode[$p->id] = null;
                    continue;
                }

                $matiereId  = $notesP->first()->devoir->matiere_id;
                $totalCoeff = $notesP->sum(fn($n) => (float) $n->devoir->coeff_devoir);
                $somme      = $notesP->sum(fn($n) => (float) $n->note * (float) $n->devoir->coeff_devoir);
                $parPeriode[$p->id] = $totalCoeff > 0 ? round($somme / $totalCoeff, 2) : null;
            }

            $moyennesTrim = array_filter($parPeriode, fn($m) => $m !== null);
            $moyAnn       = count($moyennesTrim) > 0 ? round(array_sum($moyennesTrim) / count($moyennesTrim), 2) : null;
            $coeff        = $matiereId ? ($coefficients[$matiereId] ?? 1) : 1;

            $parMatiere[$libelle] = [
                'coeff'            => $coeff,
                'par_periode'      => $parPeriode,
                'moyenne_annuelle' => $moyAnn,
                'matiere_id'       => $matiereId,
                'rang'             => null,
            ];
        }

        // Moyenne générale annuelle
        $avecMoy         = $parMatiere->filter(fn($m) => $m['moyenne_annuelle'] !== null);
        $sommePonderee   = $avecMoy->sum(fn($m) => $m['moyenne_annuelle'] * $m['coeff']);
        $sommeCoeffs     = $avecMoy->sum(fn($m) => $m['coeff']);
        $moyenneAnnuelle = $sommeCoeffs > 0 ? round($sommePonderee / $sommeCoeffs, 2) : null;

        // Rangs annuels (classe entière)
        [$rangAnnuel, $effectif, $parMatiere] = $this->calculerRangs($eleve, $periodeIds, $niveauId, $coefficients, $parMatiere);

        $etablissement = Etablissement::first();
        $pdf = Pdf::loadView('bulletins.releve_annuel', compact(
            'eleve', 'annee', 'periodes', 'parMatiere',
            'moyenneAnnuelle', 'rangAnnuel', 'effectif', 'etablissement'
        ))->setPaper('A4', 'portrait');

        $nomFichier = sprintf(
            'releve_annuel_%s_%s_%s.pdf',
            strtolower($eleve->nom_eleve),
            strtolower($eleve->prenoms_eleve),
            str_replace('/', '-', $annee)
        );

        return $pdf->download($nomFichier);
    }

    private function calculerRangs($eleve, array $periodeIds, ?int $niveauId, array $coefficients, $parMatiereEleve): array
    {
        if (!$eleve->classe_id) {
            return [null, null, $parMatiereEleve];
        }

        $eleveIds = Eleve::where('classe_id', $eleve->classe_id)->pluck('id');
        $effectif = $eleveIds->count();

        // Batch : toutes les notes de la classe en une seule requête
        $toutesNotes = Note::with(['devoir.matiere'])
            ->whereIn('eleve_id', $eleveIds)
            ->whereHas('devoir', function ($q) use ($periodeIds, $eleve, $niveauId) {
                $q->whereIn('periode_id', $periodeIds)
                  ->where(function ($q2) use ($eleve, $niveauId) {
                      $q2->where('classe_id', $eleve->classe_id)
                         ->orWhere('niveau_id', $niveauId);
                  });
            })
            ->get()
            ->groupBy('eleve_id');

        $moyennesGlobales   = [];
        $moyennesParMatiere = [];

        foreach ($eleveIds as $eid) {
            $notesEleve = $toutesNotes->get($eid, collect());
            $parMatiere = $notesEleve
                ->filter(fn($n) => $n->devoir?->matiere !== null)
                ->groupBy(fn($n) => $n->devoir->matiere->libelle_matiere)
                ->map(function ($notesM) use ($coefficients) {
                    $matiereId = $notesM->first()->devoir->matiere_id;
                    $coeff     = $coefficients[$matiereId] ?? 1;
                    $totalC    = $notesM->sum(fn($n) => (float) $n->devoir->coeff_devoir);
                    $somme     = $notesM->sum(fn($n) => (float) $n->note * (float) $n->devoir->coeff_devoir);
                    return ['moyenne' => $totalC > 0 ? round($somme / $totalC, 2) : null, 'coeff' => $coeff];
                });

            foreach ($parMatiere as $lib => $data) {
                $moyennesParMatiere[$lib][$eid] = $data['moyenne'];
            }

            $avecMoy = $parMatiere->filter(fn($m) => $m['moyenne'] !== null);
            $sc      = $avecMoy->sum(fn($m) => $m['coeff']);
            $sp      = $avecMoy->sum(fn($m) => $m['moyenne'] * $m['coeff']);
            $moyennesGlobales[$eid] = $sc > 0 ? round($sp / $sc, 2) : null;
        }

        $rangsGlobaux = $this->attribuerRangs($moyennesGlobales);
        $rangAnnuel   = $rangsGlobaux[$eleve->id] ?? null;

        // Rangs par matière — utilise put() pour modifier la Collection en place
        foreach ($moyennesParMatiere as $lib => $moysEleves) {
            $rangs = $this->attribuerRangs($moysEleves);
            if ($parMatiereEleve->has($lib)) {
                $info         = $parMatiereEleve->get($lib);
                $info['rang'] = $rangs[$eleve->id] ?? null;
                $parMatiereEleve->put($lib, $info);
            }
        }

        return [$rangAnnuel, $effectif, $parMatiereEleve];
    }

    private function attribuerRangs(array $moyennesParId): array
    {
        $rangs      = array_fill_keys(array_keys($moyennesParId), null);
        $avecMoy    = array_filter($moyennesParId, fn($m) => $m !== null);
        arsort($avecMoy);
        $position   = 1;
        $precedente = PHP_INT_MAX;
        $nbEx       = 0;
        foreach ($avecMoy as $id => $moy) {
            if ($moy !== $precedente) { $position += $nbEx; $nbEx = 0; }
            $rangs[$id] = $position;
            $precedente = $moy;
            $nbEx++;
        }
        return $rangs;
    }

    private function coefficientsMatiere(?int $niveauId, ?int $serieId): array
    {
        if (!$niveauId) return [];
        $rows = DB::table('niveau_matieres')
            ->where('niveau_id', $niveauId)
            ->whereIn('serie_id', array_filter([$serieId, null]))
            ->select('matiere_id', 'serie_id', 'coefficient')
            ->get();
        $result = [];
        foreach ($rows as $r) {
            $mid = $r->matiere_id;
            if (!isset($result[$mid]) || ($r->serie_id !== null && $serieId !== null)) {
                $result[$mid] = (float) ($r->coefficient ?? 1);
            }
        }
        return $result;
    }
}
