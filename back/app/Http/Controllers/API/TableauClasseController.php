<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\Niveau;
use App\Models\Note;
use App\Models\Periodes;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;

class TableauClasseController extends Controller
{
    /**
     * Tableau des moyennes et rangs pour une seule classe (toutes périodes de l'année).
     * GET /tableau-classe/{classeId}/{annee}
     */
    public function telechargerClasse(string $classeId, string $annee)
    {
        ini_set('memory_limit', '512M');
        set_time_limit(300);

        $classe   = Classe::with('niveau')->findOrFail($classeId);
        $periodes = Periodes::where('annee', $annee)->orderBy('id')->get();

        if ($periodes->isEmpty()) {
            abort(404, "Aucune période pour l'année scolaire {$annee}.");
        }

        $donnees       = $this->calculerDonnees(collect([$classe]), $periodes);
        $etablissement = Etablissement::first();

        $pdf = Pdf::loadView('bulletins.tableau_classe', compact('donnees', 'periodes', 'etablissement'))
            ->setPaper('A4', 'landscape');

        $nomFichier = sprintf(
            'tableau_%s_%s.pdf',
            strtolower(str_replace(' ', '_', $classe->nom_classe ?? $classeId)),
            str_replace('/', '-', $annee)
        );

        return $pdf->download($nomFichier);
    }

    /**
     * Tableau des moyennes et rangs pour toutes les classes d'un niveau (par lot).
     * GET /tableau-niveau/{niveauId}/{annee}
     */
    public function telechargerNiveau(string $niveauId, string $annee)
    {
        ini_set('memory_limit', '512M');
        set_time_limit(300);

        $niveau   = Niveau::findOrFail($niveauId);
        $classes  = Classe::where('niveau_id', $niveauId)->orderBy('nom_classe')->get();
        $periodes = Periodes::where('annee', $annee)->orderBy('id')->get();

        if ($periodes->isEmpty()) {
            abort(404, "Aucune période pour l'année scolaire {$annee}.");
        }

        if ($classes->isEmpty()) {
            abort(404, "Aucune classe pour ce niveau.");
        }

        $donnees       = $this->calculerDonnees($classes, $periodes);
        $etablissement = Etablissement::first();

        $pdf = Pdf::loadView('bulletins.tableau_classe', compact('donnees', 'periodes', 'etablissement'))
            ->setPaper('A4', 'landscape');

        $nomFichier = sprintf(
            'tableau_%s_%s.pdf',
            strtolower(str_replace(' ', '_', $niveau->nom_niveau ?? $niveauId)),
            str_replace('/', '-', $annee)
        );

        return $pdf->download($nomFichier);
    }

    /**
     * Calcule les moyennes et rangs pour une collection de classes.
     * Retourne un tableau de données indexé par classe.
     */
    private function calculerDonnees(\Illuminate\Support\Collection $classes, \Illuminate\Support\Collection $periodes): array
    {
        $periodeIds = $periodes->pluck('id')->toArray();
        $result     = [];

        foreach ($classes as $classe) {
            $niveauId     = $classe->niveau_id;
            $serieId      = $classe->serie_id ?? null;
            $coefficients = $this->coefficientsMatiere($niveauId, $serieId);

            $eleves = Eleve::where('classe_id', $classe->id)
                ->orderBy('nom_eleve')
                ->orderBy('prenoms_eleve')
                ->get();

            if ($eleves->isEmpty()) {
                $result[] = ['classe' => $classe, 'eleves' => collect(), 'effectif' => 0];
                continue;
            }

            $elevesIds = $eleves->pluck('id')->toArray();

            // Chargement en batch de toutes les notes de la classe pour toutes les périodes
            $toutesNotes = Note::with(['devoir.matiere'])
                ->whereHas('devoir', function ($q) use ($periodeIds, $classe, $niveauId) {
                    $q->whereIn('periode_id', $periodeIds)
                      ->where(function ($q2) use ($classe, $niveauId) {
                          $q2->where('classe_id', $classe->id)
                             ->orWhere('niveau_id', $niveauId);
                      });
                })
                ->whereIn('eleve_id', $elevesIds)
                ->get()
                ->groupBy(fn($n) => (string) $n->eleve_id)
                ->map(fn($g) => $g->groupBy(fn($n) => (string) $n->devoir->periode_id));

            // Moyennes par élève et par période
            $donnees = $eleves->map(function ($eleve) use ($periodes, $coefficients, $toutesNotes) {
                $notesEleve = $toutesNotes->get((string) $eleve->id, collect());

                $moyennesParPeriode = [];
                foreach ($periodes as $p) {
                    $notes = $notesEleve->get((string) $p->id, collect());
                    $moyennesParPeriode[$p->id] = $this->moyenneGenerale($notes, $coefficients);
                }

                $trims           = array_filter($moyennesParPeriode, fn($m) => $m !== null);
                $moyenneAnnuelle = count($trims) > 0
                    ? round(array_sum($trims) / count($trims), 2)
                    : null;

                return compact('eleve', 'moyennesParPeriode', 'moyenneAnnuelle');
            });

            // Rangs par période
            $rangsParPeriode = [];
            foreach ($periodes as $p) {
                $moys = $donnees->mapWithKeys(fn($d) => [$d['eleve']->id => $d['moyennesParPeriode'][$p->id]])->all();
                $rangsParPeriode[$p->id] = $this->attribuerRangs($moys);
            }

            // Rangs annuels
            $moysAnn      = $donnees->mapWithKeys(fn($d) => [$d['eleve']->id => $d['moyenneAnnuelle']])->all();
            $rangsAnnuels = $this->attribuerRangs($moysAnn);
            $effectif     = $eleves->count();

            $donnees = $donnees->map(function ($d) use ($rangsParPeriode, $rangsAnnuels, $effectif, $periodes) {
                $eleveId = $d['eleve']->id;
                $d['rangsParPeriode'] = collect($periodes)
                    ->mapWithKeys(fn($p) => [$p->id => $rangsParPeriode[$p->id][$eleveId] ?? null])
                    ->all();
                $d['rangAnnuel'] = $rangsAnnuels[$eleveId] ?? null;
                $d['effectif']   = $effectif;
                return $d;
            });

            $result[] = compact('classe', 'donnees', 'effectif');
        }

        return $result;
    }

    /**
     * Calcule la moyenne générale pondérée d'un élève pour une collection de notes.
     */
    private function moyenneGenerale(\Illuminate\Support\Collection $notes, array $coefficients): ?float
    {
        if ($notes->isEmpty()) return null;

        $parMatiere = $notes
            ->filter(fn($n) => $n->devoir?->matiere !== null)
            ->groupBy(fn($n) => $n->devoir->matiere_id)
            ->map(function ($notesM) use ($coefficients) {
                $matiereId    = $notesM->first()->devoir->matiere_id;
                $coeffMatiere = $coefficients[$matiereId] ?? 1.0;
                $totalCoeff   = $notesM->sum(fn($n) => (float) $n->devoir->coeff_devoir);
                $somme        = $notesM->sum(fn($n) => (float) $n->note * (float) $n->devoir->coeff_devoir);
                return [
                    'moyenne'       => $totalCoeff > 0 ? $somme / $totalCoeff : null,
                    'coeff_matiere' => $coeffMatiere,
                ];
            });

        $avecMoy = $parMatiere->filter(fn($m) => $m['moyenne'] !== null);
        $sc      = $avecMoy->sum(fn($m) => $m['coeff_matiere']);

        return $sc > 0
            ? round($avecMoy->sum(fn($m) => $m['moyenne'] * $m['coeff_matiere']) / $sc, 2)
            : null;
    }

    // Rang olympique : ex. [15, 14, 14, 12] → [1, 2, 2, 4]
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
