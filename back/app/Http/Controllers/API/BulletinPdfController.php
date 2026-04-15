<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
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

        $coefficients = $this->coefficientsMatiere($niveauId, $serieId);

        $parMatiere = $notes->groupBy(fn($n) => $n->devoir->matiere->libelle_matiere)
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

        // Moyenne générale pondérée par coefficient matière
        $avecMoyenne     = $parMatiere->filter(fn($m) => $m['moyenne'] !== null);
        $sommePonderee   = $avecMoyenne->sum(fn($m) => $m['moyenne'] * $m['coeff_matiere']);
        $sommeCoeffs     = $avecMoyenne->sum(fn($m) => $m['coeff_matiere']);
        $moyenneGenerale = $sommeCoeffs > 0 ? round($sommePonderee / $sommeCoeffs, 2) : null;

        $etablissement = Etablissement::first();
        $pdf = Pdf::loadView('bulletins.bulletin', compact('eleve', 'periode', 'parMatiere', 'etablissement', 'moyenneGenerale'))
            ->setPaper('A4', 'portrait');

        $nomFichier = sprintf(
            'bulletin_%s_%s_%s.pdf',
            strtolower($eleve->nom_eleve),
            strtolower($eleve->prenoms_eleve),
            $periode->abbr_libelle_periode ?? $periodeId
        );

        return $pdf->download($nomFichier);
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
