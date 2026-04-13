<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\Note;
use App\Models\Periodes;
use Barryvdh\DomPDF\Facade\Pdf;

class BulletinPdfController extends Controller
{
    public function telecharger(string $eleveId, string $periodeId)
    {
        $eleve   = Eleve::with('classe.niveau')->findOrFail($eleveId);
        $periode = Periodes::findOrFail($periodeId);
        $niveauId = $eleve->classe?->niveau_id;

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

        $parMatiere = $notes->groupBy(fn($n) => $n->devoir->matiere->libelle_matiere)
            ->map(function ($notesMatiere) {
                $totalCoeff = $notesMatiere->sum(fn($n) => $n->devoir->coeff_devoir);
                $sommeCoeff = $notesMatiere->sum(fn($n) => $n->note * $n->devoir->coeff_devoir);
                return [
                    'moyenne' => $totalCoeff > 0 ? round($sommeCoeff / $totalCoeff, 2) : null,
                ];
            });

        $etablissement = Etablissement::first();
        $pdf = Pdf::loadView('bulletins.bulletin', compact('eleve', 'periode', 'parMatiere', 'etablissement'))
            ->setPaper('A4', 'portrait');

        $nomFichier = sprintf(
            'bulletin_%s_%s_%s.pdf',
            strtolower($eleve->nom_eleve),
            strtolower($eleve->prenoms_eleve),
            $periode->abbr_libelle_periode ?? $periodeId
        );

        return $pdf->download($nomFichier);
    }
}
