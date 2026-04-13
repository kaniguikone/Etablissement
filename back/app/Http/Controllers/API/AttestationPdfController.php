<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Eleve;
use App\Models\Etablissement;
use App\Models\Periodes;
use Barryvdh\DomPDF\Facade\Pdf;

class AttestationPdfController extends Controller
{
    public function scolarite(string $eleveId)
    {
        $eleve  = Eleve::with('classe.niveau', 'parent')->findOrFail($eleveId);
        $annee  = Periodes::orderByDesc('date_debut')->value('annee') ?? date('Y') . '-' . (date('Y') + 1);

        $etablissement = Etablissement::first();
        $pdf = Pdf::loadView('attestations.scolarite', compact('eleve', 'annee', 'etablissement'))
            ->setPaper('A4', 'portrait');

        $nomFichier = sprintf(
            'attestation_scolarite_%s_%s.pdf',
            strtolower($eleve->nom_eleve),
            strtolower($eleve->prenoms_eleve)
        );

        return $pdf->download($nomFichier);
    }
}
