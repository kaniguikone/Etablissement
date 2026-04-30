<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\Note;
use App\Models\Periodes;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;

class BulletinPdfController extends Controller
{
    public function telecharger(string $eleveId, string $periodeId)
    {
        $eleve    = Eleve::with('classe.niveau')->findOrFail($eleveId);
        $periode  = Periodes::findOrFail($periodeId);
        $niveauId = $eleve->classe?->niveau_id;
        $serieId  = $eleve->classe?->serie_id;

        $coefficients = $this->coefficientsMatiere($niveauId, $serieId);

        // Moyennes du trimestre courant
        $parMatiere = $this->calculerParMatiere($eleveId, $periodeId, $eleve, $niveauId, $coefficients);

        $avecMoyenne     = $parMatiere->filter(fn($m) => $m['moyenne'] !== null);
        $sommePonderee   = $avecMoyenne->sum(fn($m) => $m['moyenne'] * $m['coeff_matiere']);
        $sommeCoeffs     = $avecMoyenne->sum(fn($m) => $m['coeff_matiere']);
        $moyenneGenerale = $sommeCoeffs > 0 ? round($sommePonderee / $sommeCoeffs, 2) : null;

        // Détecte si c'est la dernière période de l'année
        $periodesAnnee     = Periodes::where('annee', $periode->annee)->orderBy('id')->get();
        $estDerniereperiode = $periodesAnnee->last()?->id === $periode->id && $periodesAnnee->count() > 1;

        $parMatiereAnnuelle = null;
        $moyenneAnnuelle    = null;

        if ($estDerniereperiode) {
            // Calcul des moyennes par trimestre pour chaque matière
            $moyennesParPeriode = [];
            foreach ($periodesAnnee as $p) {
                $moyennesParPeriode[$p->id] = $this->calculerParMatiere($eleveId, $p->id, $eleve, $niveauId, $coefficients);
            }

            // Moyenne annuelle par matière = moyenne des moyennes trimestrielles
            $toutesLesMatieres = collect($moyennesParPeriode)
                ->flatMap(fn($m) => $m->keys())
                ->unique();

            $parMatiereAnnuelle = $toutesLesMatieres->mapWithKeys(function ($matiere) use ($moyennesParPeriode, $coefficients) {
                $moyennesTrim = collect($moyennesParPeriode)
                    ->map(fn($pm) => $pm->get($matiere)['moyenne'] ?? null)
                    ->filter(fn($m) => $m !== null);

                $moyenneAnn  = $moyennesTrim->count() > 0 ? round($moyennesTrim->average(), 2) : null;
                $coeffFirst  = collect($moyennesParPeriode)->map(fn($pm) => $pm->get($matiere))->filter()->first();
                $coeff       = $coeffFirst['coeff_matiere'] ?? 1;

                return [$matiere => ['moyenne' => $moyenneAnn, 'coeff_matiere' => $coeff]];
            });

            // Moyenne générale annuelle pondérée
            $avecMoyenneAnn    = $parMatiereAnnuelle->filter(fn($m) => $m['moyenne'] !== null);
            $sommePondereeAnn  = $avecMoyenneAnn->sum(fn($m) => $m['moyenne'] * $m['coeff_matiere']);
            $sommeCoeffsAnn    = $avecMoyenneAnn->sum(fn($m) => $m['coeff_matiere']);
            $moyenneAnnuelle   = $sommeCoeffsAnn > 0 ? round($sommePondereeAnn / $sommeCoeffsAnn, 2) : null;
        }

        // Rangs global + par matière (trimestriels et annuels)
        $rangsComplets = $this->calculerRangsComplets(
            (int) $eleveId, $eleve, $periodeId, $niveauId, $serieId, $coefficients,
            $estDerniereperiode, $periodesAnnee
        );
        $rang     = $rangsComplets['rang'];
        $effectif = $rangsComplets['effectif'];
        $parMatiere = $parMatiere->map(function ($info, $matiere) use ($rangsComplets) {
            $info['rang'] = $rangsComplets['rangsParMatiere'][$matiere] ?? null;
            return $info;
        });
        if ($estDerniereperiode && $parMatiereAnnuelle) {
            $parMatiereAnnuelle = $parMatiereAnnuelle->map(function ($info, $matiere) use ($rangsComplets) {
                $info['rang'] = $rangsComplets['rangsAnnuelsParMatiere'][$matiere] ?? null;
                return $info;
            });
        }

        $etablissement = Etablissement::first();
        $pdf = Pdf::loadView('bulletins.bulletin', compact(
            'eleve', 'periode', 'parMatiere', 'etablissement',
            'moyenneGenerale', 'estDerniereperiode',
            'parMatiereAnnuelle', 'moyenneAnnuelle',
            'rang', 'effectif'
        ))->setPaper('A4', 'portrait');

        $labelPeriode = $periode->code_periode ?? $periode->abbr_libelle_periode ?? $periodeId;

        $nomFichier = sprintf(
            'bulletin_%s_%s_%s_%s.pdf',
            strtolower($eleve->nom_eleve),
            strtolower($eleve->prenoms_eleve),
            $labelPeriode,
            $periode->annee ?? ''
        );

        return $pdf->download($nomFichier);
    }

    public function telechargerClasse(string $classeId, string $periodeId)
    {
        ini_set('memory_limit', '512M');
        set_time_limit(300);

        $classe  = Classe::with('niveau')->findOrFail($classeId);
        $periode = Periodes::findOrFail($periodeId);

        $niveauId = $classe->niveau_id;
        $serieId  = $classe->serie_id;

        $coefficients = $this->coefficientsMatiere($niveauId, $serieId);

        $periodesAnnee      = Periodes::where('annee', $periode->annee)->orderBy('id')->get();
        $estDerniereperiode = $periodesAnnee->last()?->id === $periode->id && $periodesAnnee->count() > 1;

        $eleves = Eleve::with('classe.niveau')
            ->where('classe_id', $classeId)
            ->orderBy('nom_eleve')
            ->orderBy('prenoms_eleve')
            ->get();

        // Chargement en une seule requête de toutes les notes de la classe
        $periodeIds = $estDerniereperiode
            ? $periodesAnnee->pluck('id')->toArray()
            : [(int) $periodeId];

        $toutesNotes = Note::with(['devoir.matiere', 'devoir.typeDevoir'])
            ->whereHas('devoir', function ($q) use ($periodeIds, $classeId, $niveauId) {
                $q->whereIn('periode_id', $periodeIds)
                  ->where(function ($q2) use ($classeId, $niveauId) {
                      $q2->where('classe_id', $classeId)
                         ->orWhere('niveau_id', $niveauId);
                  });
            })
            ->whereIn('eleve_id', $eleves->pluck('id')->toArray())
            ->get()
            ->groupBy(fn($n) => (string) $n->eleve_id)
            ->map(fn($g) => $g->groupBy(fn($n) => (string) $n->devoir->periode_id));
        // $toutesNotes[(string)eleve_id][(string)periode_id] = Collection de Notes

        $donnees = $eleves->map(function ($eleve) use ($periodeId, $niveauId, $coefficients, $estDerniereperiode, $periodesAnnee, $toutesNotes) {
            $key        = (string) $eleve->id;
            $notesEleve = $toutesNotes->get($key, collect());

            $parMatiere = $this->calculerDepuisNotes(
                $notesEleve->get((string) $periodeId, collect()),
                $coefficients
            );

            $avecMoyenne     = $parMatiere->filter(fn($m) => $m['moyenne'] !== null);
            $moyenneGenerale = $avecMoyenne->sum(fn($m) => $m['coeff_matiere']) > 0
                ? round($avecMoyenne->sum(fn($m) => $m['moyenne'] * $m['coeff_matiere']) / $avecMoyenne->sum(fn($m) => $m['coeff_matiere']), 2)
                : null;

            $parMatiereAnnuelle = null;
            $moyenneAnnuelle    = null;

            if ($estDerniereperiode) {
                $moyennesParPeriode = [];
                foreach ($periodesAnnee as $p) {
                    $moyennesParPeriode[$p->id] = $this->calculerDepuisNotes(
                        $notesEleve->get((string) $p->id, collect()),
                        $coefficients
                    );
                }

                $toutesLesMatieres  = collect($moyennesParPeriode)->flatMap(fn($m) => $m->keys())->unique();
                $parMatiereAnnuelle = $toutesLesMatieres->mapWithKeys(function ($matiere) use ($moyennesParPeriode) {
                    $moyennesTrim = collect($moyennesParPeriode)->map(fn($pm) => $pm->get($matiere)['moyenne'] ?? null)->filter(fn($m) => $m !== null);
                    $moyenneAnn   = $moyennesTrim->count() > 0 ? round($moyennesTrim->average(), 2) : null;
                    $coeffFirst   = collect($moyennesParPeriode)->map(fn($pm) => $pm->get($matiere))->filter()->first();
                    return [$matiere => ['moyenne' => $moyenneAnn, 'coeff_matiere' => $coeffFirst['coeff_matiere'] ?? 1]];
                });

                $avecAnn         = $parMatiereAnnuelle->filter(fn($m) => $m['moyenne'] !== null);
                $moyenneAnnuelle = $avecAnn->sum(fn($m) => $m['coeff_matiere']) > 0
                    ? round($avecAnn->sum(fn($m) => $m['moyenne'] * $m['coeff_matiere']) / $avecAnn->sum(fn($m) => $m['coeff_matiere']), 2)
                    : null;
            }

            return compact('eleve', 'parMatiere', 'moyenneGenerale', 'parMatiereAnnuelle', 'moyenneAnnuelle');
        });

        // Rangs globaux
        $moyennesMap  = $donnees->mapWithKeys(fn($d) => [$d['eleve']->id => $d['moyenneGenerale']])->all();
        $rangsGlobaux = $this->attribuerRangs($moyennesMap);
        $effectif     = $eleves->count();

        // Rangs par matière (trimestriels)
        $toutesLesMatieres     = $donnees->flatMap(fn($d) => $d['parMatiere']->keys())->unique();
        $rangsParMatiereGlobal = [];
        foreach ($toutesLesMatieres as $matiere) {
            $moys = $donnees->mapWithKeys(fn($d) => [$d['eleve']->id => $d['parMatiere']->get($matiere)['moyenne'] ?? null])->all();
            $rangsParMatiereGlobal[$matiere] = $this->attribuerRangs($moys);
        }

        // Rangs par matière annuels (si dernière période)
        $rangsAnnuelsParMatiereGlobal = [];
        if ($estDerniereperiode) {
            $matieresAnn = $donnees->flatMap(fn($d) => $d['parMatiereAnnuelle'] ? $d['parMatiereAnnuelle']->keys() : collect())->unique();
            foreach ($matieresAnn as $matiere) {
                $moys = $donnees->mapWithKeys(fn($d) => [$d['eleve']->id => $d['parMatiereAnnuelle']?->get($matiere)['moyenne'] ?? null])->all();
                $rangsAnnuelsParMatiereGlobal[$matiere] = $this->attribuerRangs($moys);
            }
        }

        $donnees = $donnees->map(function ($d) use ($rangsGlobaux, $rangsParMatiereGlobal, $rangsAnnuelsParMatiereGlobal, $effectif) {
            $eleveId = $d['eleve']->id;
            $d['rang']     = $rangsGlobaux[$eleveId] ?? null;
            $d['effectif'] = $effectif;
            $d['parMatiere'] = $d['parMatiere']->map(function ($info, $matiere) use ($eleveId, $rangsParMatiereGlobal) {
                $info['rang'] = $rangsParMatiereGlobal[$matiere][$eleveId] ?? null;
                return $info;
            });
            if ($d['parMatiereAnnuelle']) {
                $d['parMatiereAnnuelle'] = $d['parMatiereAnnuelle']->map(function ($info, $matiere) use ($eleveId, $rangsAnnuelsParMatiereGlobal) {
                    $info['rang'] = $rangsAnnuelsParMatiereGlobal[$matiere][$eleveId] ?? null;
                    return $info;
                });
            }
            return $d;
        });

        $etablissement = Etablissement::first();

        $pdf = Pdf::loadView('bulletins.bulletins_classe', compact(
            'donnees', 'periode', 'classe', 'etablissement', 'estDerniereperiode'
        ))->setPaper('A4', 'portrait');

        $labelPeriode = $periode->code_periode ?? $periode->abbr_libelle_periode ?? $periodeId;
        $nomFichier   = sprintf('bulletins_%s_%s_%s.pdf',
            strtolower(str_replace(' ', '_', $classe->nom_classe ?? $classeId)),
            $labelPeriode,
            $periode->annee ?? ''
        );

        return $pdf->download($nomFichier);
    }

    private function calculerRangsComplets(int $eleveId, $eleve, string $periodeId, ?int $niveauId, ?int $serieId, array $coefficients, bool $estDerniereperiode = false, $periodesAnnee = null): array
    {
        if (!$eleve->classe_id) return ['rang' => null, 'effectif' => null, 'rangsParMatiere' => [], 'rangsAnnuelsParMatiere' => []];

        $tousEleves = Eleve::where('classe_id', $eleve->classe_id)->get();

        $donneesParEleve = [];
        foreach ($tousEleves as $e) {
            $pm   = $this->calculerParMatiere((string) $e->id, $periodeId, $e, $niveauId, $coefficients);
            $avec = $pm->filter(fn($m) => $m['moyenne'] !== null);
            $sc   = $avec->sum(fn($m) => $m['coeff_matiere']);

            $parMatiereAnn = collect();
            if ($estDerniereperiode && $periodesAnnee) {
                $moyParPeriode = [];
                foreach ($periodesAnnee as $p) {
                    $moyParPeriode[$p->id] = $this->calculerParMatiere((string) $e->id, (string) $p->id, $e, $niveauId, $coefficients);
                }
                $matieres      = collect($moyParPeriode)->flatMap(fn($m) => $m->keys())->unique();
                $parMatiereAnn = $matieres->mapWithKeys(function ($matiere) use ($moyParPeriode) {
                    $trims = collect($moyParPeriode)->map(fn($pm) => $pm->get($matiere)['moyenne'] ?? null)->filter();
                    return [$matiere => ['moyenne' => $trims->count() > 0 ? round($trims->average(), 2) : null]];
                });
            }

            $donneesParEleve[$e->id] = [
                'parMatiere'    => $pm,
                'moyenneGenerale' => $sc > 0 ? round($avec->sum(fn($m) => $m['moyenne'] * $m['coeff_matiere']) / $sc, 2) : null,
                'parMatiereAnn' => $parMatiereAnn,
            ];
        }

        // Rang global trimestriel
        $rangsGlobaux = $this->attribuerRangs(array_map(fn($d) => $d['moyenneGenerale'], $donneesParEleve));

        // Rangs trimestriels par matière
        $toutesLesMatieres = collect($donneesParEleve)->flatMap(fn($d) => $d['parMatiere']->keys())->unique();
        $rangsParMatiere   = [];
        foreach ($toutesLesMatieres as $matiere) {
            $moys = array_map(fn($d) => $d['parMatiere']->get($matiere)['moyenne'] ?? null, $donneesParEleve);
            $rangsParMatiere[$matiere] = $this->attribuerRangs($moys)[$eleveId] ?? null;
        }

        // Rangs annuels par matière
        $rangsAnnuelsParMatiere = [];
        if ($estDerniereperiode) {
            $matieresAnn = collect($donneesParEleve)->flatMap(fn($d) => $d['parMatiereAnn']->keys())->unique();
            foreach ($matieresAnn as $matiere) {
                $moys = array_map(fn($d) => $d['parMatiereAnn']->get($matiere)['moyenne'] ?? null, $donneesParEleve);
                $rangsAnnuelsParMatiere[$matiere] = $this->attribuerRangs($moys)[$eleveId] ?? null;
            }
        }

        return [
            'rang'                   => $rangsGlobaux[$eleveId] ?? null,
            'effectif'               => count($tousEleves),
            'rangsParMatiere'        => $rangsParMatiere,
            'rangsAnnuelsParMatiere' => $rangsAnnuelsParMatiere,
        ];
    }

    // Rang olympique : ex. [15, 14, 14, 12] → [1, 2, 2, 4] ; sans note → null
    private function attribuerRangs(array $moyennesParId): array
    {
        $rangs = array_fill_keys(array_keys($moyennesParId), null);

        $avecMoyenne = array_filter($moyennesParId, fn($m) => $m !== null);
        arsort($avecMoyenne);

        $position  = 1;
        $precedente = PHP_INT_MAX;
        $nbEx       = 0;

        foreach ($avecMoyenne as $id => $moy) {
            if ($moy !== $precedente) {
                $position  += $nbEx;
                $nbEx       = 0;
            }
            $rangs[$id] = $position;
            $precedente  = $moy;
            $nbEx++;
        }

        return $rangs;
    }

    // Calcule parMatiere à partir d'une collection de Notes déjà chargées (évite les requêtes N+1)
    private function calculerDepuisNotes(\Illuminate\Support\Collection $notes, array $coefficients): \Illuminate\Support\Collection
    {
        if ($notes->isEmpty()) return collect();

        return $notes->groupBy(fn($n) => $n->devoir->matiere->libelle_matiere)
            ->map(function ($notesMatiere) use ($coefficients) {
                $matiereId    = $notesMatiere->first()->devoir->matiere_id;
                $coeffMatiere = $coefficients[$matiereId] ?? 1.0;
                $totalCoeff   = $notesMatiere->sum(fn($n) => (float) $n->devoir->coeff_devoir);
                $sommeCoeff   = $notesMatiere->sum(fn($n) => (float) $n->note * (float) $n->devoir->coeff_devoir);
                return [
                    'moyenne'       => $totalCoeff > 0 ? round($sommeCoeff / $totalCoeff, 2) : null,
                    'coeff_matiere' => $coeffMatiere,
                ];
            });
    }

    private function calculerParMatiere(string $eleveId, string $periodeId, $eleve, ?int $niveauId, array $coefficients): \Illuminate\Support\Collection
    {
        $notes = Note::with(['devoir.matiere', 'devoir.typeDevoir'])
            ->whereHas('devoir', function ($q) use ($periodeId, $eleve, $niveauId) {
                $q->where('periode_id', $periodeId)
                  ->where(function ($q2) use ($eleve, $niveauId) {
                      $q2->where('classe_id', $eleve->classe_id)
                         ->orWhere('niveau_id', $niveauId);
                  });
            })
            ->where('eleve_id', $eleveId)
            ->get();

        return $notes->groupBy(fn($n) => $n->devoir->matiere->libelle_matiere)
            ->map(function ($notesMatiere) use ($coefficients) {
                $matiereId    = $notesMatiere->first()->devoir->matiere_id;
                $coeffMatiere = $coefficients[$matiereId] ?? 1.0;
                $totalCoeff   = $notesMatiere->sum(fn($n) => (float) $n->devoir->coeff_devoir);
                $sommeCoeff   = $notesMatiere->sum(fn($n) => (float) $n->note * (float) $n->devoir->coeff_devoir);
                return [
                    'moyenne'       => $totalCoeff > 0 ? round($sommeCoeff / $totalCoeff, 2) : null,
                    'coeff_matiere' => $coeffMatiere,
                ];
            });
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
