<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Note;
use App\Models\Devoir;
use App\Models\Periodes;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NoteController extends Controller
{
    /**
     * Retourne toutes les notes d'un devoir avec les infos de l'élève.
     */
    public function notesDevoir(string $devoirId, Request $request)
    {
        $devoir = Devoir::with(['classe', 'niveau', 'matiere', 'typeDevoir', 'periode'])->findOrFail($devoirId);

        // Devoir lié à un niveau : on a besoin d'une classe choisie par l'utilisateur
        if ($devoir->niveau_id && !$devoir->classe_id) {
            $classeId = $request->query('classe_id');

            if (!$classeId) {
                // Retourne les classes du niveau pour que le frontend propose le choix
                $classes = Classe::where('niveau_id', $devoir->niveau_id)
                    ->orderBy('nom_classe')
                    ->get();

                return response()->json([
                    'devoir'          => $devoir,
                    'notes'           => [],
                    'classes_niveau'  => $classes,
                ]);
            }

            $eleves = Eleve::where('classe_id', $classeId)
                ->orderBy('nom_eleve')
                ->get();
        } else {
            $classeId = $devoir->classe_id;
            $eleves = Eleve::where('classe_id', $classeId)
                ->orderBy('nom_eleve')
                ->get();
        }

        $notes = Note::where('devoir_id', $devoirId)->get()->keyBy('eleve_id');

        $data = $eleves->map(function ($eleve) use ($notes) {
            $note = $notes->get($eleve->id);
            return [
                'eleve_id'        => $eleve->id,
                'nom_eleve'       => $eleve->nom_eleve,
                'prenoms_eleve'   => $eleve->prenoms_eleve,
                'matricule_eleve' => $eleve->matricule_eleve,
                'note_id'         => $note?->id,
                'note'            => $note?->note,
            ];
        });

        return response()->json([
            'devoir'         => $devoir,
            'notes'          => $data,
            'classes_niveau' => [],
        ]);
    }

    /**
     * Sauvegarde en masse les notes d'un devoir (upsert).
     */
    public function sauvegarder(Request $request, string $devoirId)
    {
        Devoir::findOrFail($devoirId);

        $request->validate([
            'notes'             => 'required|array',
            'notes.*.eleve_id'  => 'required|exists:eleves,id',
            'notes.*.note'      => 'nullable|numeric|min:0|max:20',
        ]);

        foreach ($request->notes as $item) {
            if ($item['note'] === null || $item['note'] === '') {
                Note::where('devoir_id', $devoirId)
                    ->where('eleve_id', $item['eleve_id'])
                    ->delete();
            } else {
                Note::updateOrCreate(
                    ['devoir_id' => $devoirId, 'eleve_id' => $item['eleve_id']],
                    ['note' => $item['note']]
                );
            }
        }

        return response()->json(['message' => 'Notes enregistrées avec succès.']);
    }

    /**
     * Notes d'un élève sur toutes ses matières pour une période.
     */
    public function bulletin(string $eleveId, string $periodeId)
    {
        $eleve    = Eleve::with('classe.niveau')->findOrFail($eleveId);
        $niveauId = $eleve->classe?->niveau_id;
        $serieId  = $eleve->classe?->serie_id;

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

        // Coefficients des matières pour ce niveau+série
        $coefficients = $this->coefficientsMatiere($niveauId, $serieId);

        // Grouper par matière
        $parMatiere = $notes->groupBy(fn($n) => $n->devoir->matiere->libelle_matiere)
            ->map(function ($notesMatiere) use ($coefficients) {
                $matiereId    = $notesMatiere->first()->devoir->matiere_id;
                $coeffMatiere = $coefficients[$matiereId] ?? 1.0;

                $totalCoeff   = $notesMatiere->sum(fn($n) => (float) $n->devoir->coeff_devoir);
                $moyenneCoeff = $notesMatiere->sum(fn($n) => (float) $n->note * (float) $n->devoir->coeff_devoir);
                $moyenne      = $totalCoeff > 0 ? round($moyenneCoeff / $totalCoeff, 2) : null;

                return [
                    'notes'         => $notesMatiere->map(fn($n) => [
                        'type'  => $n->devoir->typeDevoir->code_type_devoir,
                        'coeff' => (float) $n->devoir->coeff_devoir,
                        'note'  => $n->note !== null ? (float) $n->note : null,
                    ])->values(),
                    'moyenne'       => $moyenne,
                    'coeff_matiere' => $coeffMatiere,
                ];
            });

        // Moyenne générale pondérée par coefficient matière
        $avecMoyenne     = $parMatiere->filter(fn($m) => $m['moyenne'] !== null);
        $sommePonderee   = $avecMoyenne->sum(fn($m) => $m['moyenne'] * $m['coeff_matiere']);
        $sommeCoeffs     = $avecMoyenne->sum(fn($m) => $m['coeff_matiere']);
        $moyenneGenerale = $sommeCoeffs > 0 ? round($sommePonderee / $sommeCoeffs, 2) : null;

        return response()->json([
            'eleve'           => $eleve,
            'parMatiere'      => $parMatiere,
            'moyenneGenerale' => $moyenneGenerale,
        ]);
    }

    /**
     * Retourne les coefficients matière pour un niveau+série donnés.
     * Priorité : ligne avec serie_id correspondant > ligne sans serie_id.
     */
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
            // Préférer la ligne avec la série exacte
            if (!isset($result[$mid]) || ($r->serie_id !== null && $serieId !== null)) {
                $result[$mid] = (float) ($r->coefficient ?? 1);
            }
        }
        return $result;
    }

    /**
     * Notifier le parent qu'un bulletin est disponible.
     * POST /api/bulletin/{eleveId}/{periodeId}/notifier
     */
    public function notifierBulletin(string $eleveId, string $periodeId)
    {
        $eleve   = Eleve::with(['classe', 'parents'])->findOrFail($eleveId);
        $periode = Periodes::findOrFail($periodeId);

        if (!$eleve->parents) {
            return response()->json(['message' => 'Aucun parent associé à cet élève.'], 422);
        }

        app(NotificationService::class)->notifierParent(
            $eleve->parents->id,
            'bulletin',
            'Bulletin disponible',
            "Le bulletin de {$eleve->prenoms_eleve} {$eleve->nom_eleve} pour la période « {$periode->libelle_periode} » est disponible.",
            ['eleve_id' => $eleve->id, 'periode_id' => $periode->id]
        );

        return response()->json(['message' => 'Notification envoyée au parent.']);
    }

    /**
     * Export CSV des notes d'une classe pour une période.
     * Colonnes: Matricule, Nom, Prénoms, [Matière1, Matière2, ...], Moyenne générale
     */
    public function exportCsv(string $periodeId, Request $request)
    {
        $periode  = Periodes::findOrFail($periodeId);
        $classeId = $request->query('classe_id');

        if (!$classeId) {
            return response()->json(['message' => 'Le paramètre classe_id est requis.'], 422);
        }

        $classe = Classe::with('niveau')->findOrFail($classeId);
        $eleves = Eleve::where('classe_id', $classeId)->orderBy('nom_eleve')->get();
        $niveauId = $classe->niveau_id;

        // Récupérer toutes les notes de la période pour cette classe
        $notes = Note::with(['devoir.matiere'])
            ->whereHas('devoir', function ($q) use ($periodeId, $classeId, $niveauId) {
                $q->where('periode_id', $periodeId)
                  ->where(function ($q2) use ($classeId, $niveauId) {
                      $q2->where('classe_id', $classeId)
                         ->orWhere('niveau_id', $niveauId);
                  });
            })
            ->whereIn('eleve_id', $eleves->pluck('id'))
            ->get();

        // Lister toutes les matières présentes
        $matieres = $notes->map(fn($n) => $n->devoir->matiere->libelle_matiere)
            ->unique()->sort()->values()->all();

        $filename = sprintf('notes_%s_%s_%s.csv', $classe->nom_classe, $periode->libelle_periode ?? $periodeId, date('Y-m-d'));

        return response()->streamDownload(function () use ($eleves, $notes, $matieres) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel
            fputcsv($handle, array_merge(['Matricule', 'Nom', 'Prénoms'], $matieres, ['Moyenne générale']), ';');

            foreach ($eleves as $eleve) {
                $notesEleve = $notes->where('eleve_id', $eleve->id);
                $parMatiere = $notesEleve->groupBy(fn($n) => $n->devoir->matiere->libelle_matiere)
                    ->map(function ($nm) {
                        $coeff = $nm->sum(fn($n) => $n->devoir->coeff_devoir);
                        $somme = $nm->sum(fn($n) => $n->note * $n->devoir->coeff_devoir);
                        return $coeff > 0 ? round($somme / $coeff, 2) : null;
                    });

                $row = [$eleve->matricule_eleve, $eleve->nom_eleve, $eleve->prenoms_eleve];
                $moyennes = [];
                foreach ($matieres as $m) {
                    $moy = $parMatiere[$m] ?? null;
                    $row[]      = $moy !== null ? number_format($moy, 2, ',', '') : '';
                    if ($moy !== null) $moyennes[] = $moy;
                }
                $row[] = count($moyennes) > 0 ? number_format(array_sum($moyennes) / count($moyennes), 2, ',', '') : '';
                fputcsv($handle, $row, ';');
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
