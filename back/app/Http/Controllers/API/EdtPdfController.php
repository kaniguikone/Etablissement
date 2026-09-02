<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\EmploiDuTemps;
use App\Models\Enseignant;
use App\Models\Etablissement;
use App\Models\Matiere;
use App\Models\Salle;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Export PDF des emplois du temps avec le code couleur MENET (chantier EDT —
 * Lot 3). `ref` = "officiel" (EDT publié) ou l'id d'un scénario.
 */
class EdtPdfController extends Controller
{
    private const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    public function classe(string $ref, int $classeId)
    {
        $classe = Classe::findOrFail($classeId);
        $creneaux = $this->creneaux($ref)->where('classe_id', $classeId);

        return $this->rendre("Emploi du temps — {$classe->nom_classe}", [
            $this->grille($classe->nom_classe, $creneaux, fn ($c) => [
                $c->matiere?->libelle_matiere ?? '',
                $c->enseignant ? "{$c->enseignant->nom_enseignant} {$c->enseignant->prenoms_enseignant}" : '',
                $c->salle?->nom ?? '',
            ]),
        ], "edt-{$this->slug($classe->nom_classe)}");
    }

    public function toutesClasses(string $ref)
    {
        $creneaux = $this->creneaux($ref);
        $grilles = Classe::orderBy('niveau_id')->orderBy('nom_classe')->get()
            ->map(fn ($classe) => $this->grille(
                $classe->nom_classe,
                $creneaux->where('classe_id', $classe->id),
                fn ($c) => [
                    $c->matiere?->abbr_matiere ?? '',
                    $c->enseignant?->nom_enseignant ?? '',
                    $c->salle?->nom ?? '',
                ],
            ))
            ->filter(fn ($g) => ! empty($g['creneaux']))
            ->values()->all();

        return $this->rendre('Emplois du temps — toutes les classes', $grilles, 'edt-toutes-classes');
    }

    public function enseignant(string $ref, int $enseignantId)
    {
        $ens = Enseignant::findOrFail($enseignantId);
        $creneaux = $this->creneaux($ref)->where('enseignant_id', $enseignantId);

        return $this->rendre("Emploi du temps — {$ens->nom_enseignant} {$ens->prenoms_enseignant}", [
            $this->grille("{$ens->nom_enseignant} {$ens->prenoms_enseignant}", $creneaux, fn ($c) => [
                $c->matiere?->abbr_matiere ?? '',
                $c->classe?->nom_classe ?? '',
                $c->salle?->nom ?? '',
            ]),
        ], "edt-{$this->slug($ens->nom_enseignant)}");
    }

    public function salle(string $ref, int $salleId)
    {
        $salle = Salle::findOrFail($salleId);
        $creneaux = $this->creneaux($ref)->where('salle_id', $salleId);

        return $this->rendre("Occupation — salle {$salle->nom}", [
            $this->grille("Salle {$salle->nom}", $creneaux, fn ($c) => [
                $c->matiere?->abbr_matiere ?? '',
                $c->classe?->nom_classe ?? '',
                $c->enseignant?->nom_enseignant ?? '',
            ]),
        ], "salle-{$this->slug($salle->nom)}");
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private function creneaux(string $ref)
    {
        $q = EmploiDuTemps::withoutGlobalScope('officiel')
            ->with(['classe', 'matiere', 'enseignant', 'salle']);

        $ref === 'officiel'
            ? $q->whereNull('generation_id')
            : $q->where('generation_id', (int) $ref);

        return $q->get();
    }

    private function grille(string $titre, $creneaux, callable $lignes): array
    {
        $couleurs = collect(Matiere::FAMILLES)->map(fn ($v) => $v[1]);

        $horaires = $creneaux
            ->map(fn ($c) => substr($c->heure_debut, 0, 5).'|'.substr($c->heure_fin, 0, 5))
            ->unique()->sort()->values();

        $joursUtilises = collect(self::JOURS)->filter(
            fn ($j) => $creneaux->contains('jour', $j)
        )->values();

        $cellules = [];
        foreach ($creneaux as $c) {
            $cle = $c->jour.'|'.substr($c->heure_debut, 0, 5);
            $cellules[$cle] = [
                'lignes' => array_values(array_filter($lignes($c))),
                'couleur' => $c->matiere?->couleur ?? $couleurs->get($c->matiere?->famille, '#EEEEEE'),
            ];
        }

        return [
            'titre' => $titre,
            'jours' => $joursUtilises->all(),
            'horaires' => $horaires->map(fn ($h) => explode('|', $h))->all(),
            'cellules' => $cellules,
            'creneaux' => $creneaux->all(),
        ];
    }

    private function rendre(string $titre, array $grilles, string $fichier)
    {
        $grilles = array_values(array_filter($grilles, fn ($g) => ! empty($g['creneaux'])));

        $pdf = Pdf::loadView('edt.grille', [
            'titreDocument' => $titre,
            'etablissement' => Etablissement::first(),
            'grilles' => $grilles,
            'genere_le' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download($fichier.'.pdf');
    }

    private function slug(string $s): string
    {
        return \Illuminate\Support\Str::slug($s) ?: 'edt';
    }
}
