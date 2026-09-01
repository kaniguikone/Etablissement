<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\EmploiDuTemps;
use App\Models\Enseignant;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\NiveauMatiere;
use App\Models\SeanceType;
use App\Models\VolumeHoraire;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class VolumeHoraireController extends Controller
{
    // ── Paramétrage ─────────────────────────────────────────────────────────────

    /**
     * Volumes horaires d'un niveau avec tous les indicateurs.
     * GET /volumesHoraires/{niveau_id}
     */
    public function parNiveau(int $niveauId)
    {
        $niveau   = Niveau::findOrFail($niveauId);
        $volumes  = VolumeHoraire::with('matiere')
            ->where('niveau_id', $niveauId)
            ->orderBy('matiere_id')
            ->get();

        return response()->json([
            'niveau'  => $niveau,
            'volumes' => $volumes,
        ]);
    }

    /**
     * Créer ou mettre à jour un volume horaire (upsert).
     * POST /volumesHoraires
     */
    public function store(Request $request)
    {
        $request->validate([
            'niveau_id'      => 'required|exists:niveaux,id',
            'matiere_id'     => 'required|exists:matieres,id',
            'heures_semaine' => 'required|numeric|min:0.5|max:40',
            'semaines_annee' => 'nullable|integer|min:1|max:52',
        ]);

        $vh = VolumeHoraire::updateOrCreate(
            ['niveau_id' => $request->niveau_id, 'matiere_id' => $request->matiere_id],
            [
                'heures_semaine' => $request->heures_semaine,
                'semaines_annee' => $request->semaines_annee ?? 36,
            ]
        );

        return response()->json($vh->load('matiere'), 201);
    }

    /**
     * Modifier un volume horaire.
     * PUT /volumesHoraires/{id}
     */
    public function update(Request $request, int $id)
    {
        $vh = VolumeHoraire::findOrFail($id);
        $request->validate([
            'heures_semaine' => 'required|numeric|min:0.5|max:40',
            'semaines_annee' => 'nullable|integer|min:1|max:52',
        ]);
        $vh->update([
            'heures_semaine' => $request->heures_semaine,
            'semaines_annee' => $request->semaines_annee ?? 36,
        ]);
        return response()->json($vh->load('matiere'));
    }

    /**
     * Supprimer un volume horaire.
     * DELETE /volumesHoraires/{id}
     */
    public function destroy(int $id)
    {
        VolumeHoraire::findOrFail($id)->delete();
        return response()->json(null, 204);
    }

    // ── Analytique ──────────────────────────────────────────────────────────────

    /**
     * Conformité EDT vs volumes horaires — par classe.
     * Pour chaque classe, pour chaque matière : heures prévues vs heures placées dans l'EDT.
     * GET /volumesHoraires/conformite?niveau_id=&classe_id=
     */
    public function conformite(Request $request)
    {
        $niveauId = $request->query('niveau_id');
        $classeId = $request->query('classe_id');

        // Construire la liste des classes à analyser
        $classesQuery = Classe::with('niveau');
        if ($classeId) {
            $classesQuery->where('id', $classeId);
        } elseif ($niveauId) {
            $classesQuery->where('niveau_id', $niveauId);
        }
        $classes = $classesQuery->get();

        // Volumes horaires par niveau (indexed: niveau_id → matiere_id → vh)
        $niveauIds = $classes->pluck('niveau_id')->unique();
        $volumes   = VolumeHoraire::with('matiere')
            ->whereIn('niveau_id', $niveauIds)
            ->get()
            ->groupBy('niveau_id');

        // Créneaux EDT réels : heures par (classe_id, matiere_id)
        $creneaux = EmploiDuTemps::with('matiere')
            ->whereIn('classe_id', $classes->pluck('id'))
            ->get();

        // Calculer durée en heures par créneau
        $heuresParClasseMatiere = [];
        foreach ($creneaux as $c) {
            $debut = strtotime($c->heure_debut);
            $fin   = strtotime($c->heure_fin);
            $duree = ($fin - $debut) / 3600;
            $key   = "{$c->classe_id}_{$c->matiere_id}";
            $heuresParClasseMatiere[$key] = ($heuresParClasseMatiere[$key] ?? 0) + $duree;
        }

        $resultat = [];
        foreach ($classes as $classe) {
            $vhNiveau = $volumes[$classe->niveau_id] ?? collect();
            $matieres = [];

            foreach ($vhNiveau as $vh) {
                $key        = "{$classe->id}_{$vh->matiere_id}";
                $hPlacees   = round($heuresParClasseMatiere[$key] ?? 0, 1);
                $hPrevues   = (float) $vh->heures_semaine;
                $taux       = $hPrevues > 0 ? round(($hPlacees / $hPrevues) * 100) : null;

                $matieres[] = [
                    'matiere_id'    => $vh->matiere_id,
                    'matiere'       => $vh->matiere->libelle_matiere,
                    'matiere_abbr'  => $vh->matiere->abbr_matiere,
                    'heures_prevues'  => $hPrevues,
                    'heures_placees'  => $hPlacees,
                    'taux'          => $taux,
                    'statut'        => $this->statut($taux),
                ];
            }

            // Score global de la classe
            $tauxGlobal = count($matieres) > 0
                ? round(array_sum(array_column($matieres, 'taux')) / count($matieres))
                : null;

            $resultat[] = [
                'classe_id'   => $classe->id,
                'nom_classe'  => $classe->nom_classe,
                'niveau'      => $classe->niveau?->nom_niveau,
                'taux_global' => $tauxGlobal,
                'statut'      => $this->statut($tauxGlobal),
                'matieres'    => $matieres,
            ];
        }

        return response()->json($resultat);
    }

    /**
     * Charge horaire des enseignants (heures/semaine dans l'EDT).
     * GET /volumesHoraires/chargeEnseignants?niveau_id=
     */
    public function chargeEnseignants(Request $request)
    {
        $niveauId = $request->query('niveau_id');

        $query = EmploiDuTemps::with(['enseignant', 'classe.niveau', 'matiere']);
        if ($niveauId) {
            $query->whereHas('classe', fn ($q) => $q->where('niveau_id', $niveauId));
        }
        $creneaux = $query->get();

        // Grouper par enseignant
        $parEnseignant = $creneaux->groupBy('enseignant_id');

        $resultat = [];
        foreach ($parEnseignant as $enseignantId => $items) {
            $enseignant = $items->first()->enseignant;
            if (!$enseignant) continue;

            $totalHeures = 0;
            $parMatiere  = [];
            $classesSet  = [];

            foreach ($items as $c) {
                $duree = (strtotime($c->heure_fin) - strtotime($c->heure_debut)) / 3600;
                $totalHeures += $duree;
                $mid = $c->matiere_id;
                $parMatiere[$mid] = [
                    'matiere'     => $c->matiere?->libelle_matiere,
                    'abbr'        => $c->matiere?->abbr_matiere,
                    'heures'      => round(($parMatiere[$mid]['heures'] ?? 0) + $duree, 1),
                    'nb_creneaux' => ($parMatiere[$mid]['nb_creneaux'] ?? 0) + 1,
                ];
                if ($c->classe_id && !in_array($c->classe->nom_classe, $classesSet)) {
                    $classesSet[] = $c->classe->nom_classe;
                }
            }

            $totalHeures = round($totalHeures, 1);
            $resultat[]  = [
                'enseignant_id' => $enseignantId,
                'nom'           => $enseignant->nom_enseignant . ' ' . $enseignant->prenoms_enseignant,
                'heures_semaine' => $totalHeures,
                'nb_classes'    => count($classesSet),
                'classes'       => $classesSet,
                'par_matiere'   => array_values($parMatiere),
                'alerte'        => $totalHeures > 22 ? 'surcharge' : ($totalHeures < 8 ? 'sous_charge' : null),
            ];
        }

        usort($resultat, fn ($a, $b) => $b['heures_semaine'] <=> $a['heures_semaine']);

        return response()->json($resultat);
    }

    /**
     * Heures restantes à placer pour une classe donnée (aide saisie EDT).
     * GET /volumesHoraires/restant/{classe_id}
     */
    public function restantClasse(int $classeId)
    {
        $classe = Classe::with('niveau')->findOrFail($classeId);

        $volumes = VolumeHoraire::with('matiere')
            ->where('niveau_id', $classe->niveau_id)
            ->get();

        $creneaux = EmploiDuTemps::with('matiere')
            ->where('classe_id', $classeId)
            ->get();

        $heuresPlacees = [];
        foreach ($creneaux as $c) {
            $duree = (strtotime($c->heure_fin) - strtotime($c->heure_debut)) / 3600;
            $heuresPlacees[$c->matiere_id] = ($heuresPlacees[$c->matiere_id] ?? 0) + $duree;
        }

        $matieres = $volumes->map(function ($vh) use ($heuresPlacees) {
            $placees  = round($heuresPlacees[$vh->matiere_id] ?? 0, 1);
            $prevues  = (float) $vh->heures_semaine;
            $restant  = round($prevues - $placees, 1);
            return [
                'matiere_id'      => $vh->matiere_id,
                'matiere'         => $vh->matiere->libelle_matiere,
                'matiere_abbr'    => $vh->matiere->abbr_matiere,
                'heures_prevues'  => $prevues,
                'heures_placees'  => $placees,
                'heures_restantes'=> max(0, $restant),
                'depassement'     => $restant < 0 ? abs($restant) : 0,
                'taux'            => $prevues > 0 ? round(($placees / $prevues) * 100) : null,
                'statut'          => $this->statut($prevues > 0 ? round(($placees / $prevues) * 100) : null),
            ];
        });

        return response()->json([
            'classe'   => ['id' => $classe->id, 'nom' => $classe->nom_classe, 'niveau' => $classe->niveau?->nom_niveau],
            'matieres' => $matieres,
        ]);
    }

    // ── Séances-types : découpage des volumes en séances — chantier EDT Lot 0.4 ──

    /**
     * Matières du programme d'un niveau (et série optionnelle) avec leur
     * découpage en séances et l'écart au volume horaire.
     * GET /seances-types/{niveau_id}?serie_id=
     */
    public function seancesParNiveau(int $niveauId, Request $request)
    {
        $niveau  = Niveau::findOrFail($niveauId);
        $serieId = $request->query('serie_id') ?: null;

        $niveauMatieres = NiveauMatiere::with(['matiere:id,libelle_matiere,abbr_matiere,famille,couleur', 'seancesTypes'])
            ->where('niveau_id', $niveauId)
            ->where('serie_id', $serieId)
            ->get();

        $volumes = VolumeHoraire::where('niveau_id', $niveauId)->pluck('heures_semaine', 'matiere_id');

        $matieres = $niveauMatieres->map(function (NiveauMatiere $nm) use ($volumes) {
            $prevu = (float) ($volumes[$nm->matiere_id] ?? 0);
            $place = round($nm->seancesTypes->sum(fn (SeanceType $s) => $s->heures_semaine), 2);

            return [
                'niveau_matiere_id' => $nm->id,
                'matiere'           => $nm->matiere?->libelle_matiere,
                'matiere_abbr'      => $nm->matiere?->abbr_matiere,
                'famille'           => $nm->matiere?->famille,
                'couleur'           => $nm->matiere?->couleur,
                'heures_prevues'    => $prevu,
                'heures_seances'    => $place,
                'ecart'             => round($place - $prevu, 2),
                'seances'           => $nm->seancesTypes->map(fn (SeanceType $s) => [
                    'id'            => $s->id,
                    'duree_minutes' => $s->duree_minutes,
                    'nb_seances'    => $s->nb_seances,
                    'frequence'     => $s->frequence,
                    'tandem_code'   => $s->tandem_code,
                    'ordre'         => $s->ordre,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'niveau'   => ['id' => $niveau->id, 'nom' => $niveau->nom_niveau],
            'serie_id' => $serieId ? (int) $serieId : null,
            'matieres' => $matieres,
        ]);
    }

    public function storeSeance(Request $request)
    {
        $seance = SeanceType::create($this->validerSeance($request));

        return response()->json($seance, 201);
    }

    public function updateSeance(Request $request, int $id)
    {
        $seance = SeanceType::findOrFail($id);
        $seance->update($this->validerSeance($request, $seance->niveau_matiere_id));

        return response()->json($seance);
    }

    public function destroySeance(int $id)
    {
        SeanceType::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    /**
     * Pré-remplit les séances d'un niveau : pour chaque matière sans séance,
     * crée nb séances de 55 min = volume horaire arrondi.
     * POST /seances-types/generer/{niveau_id}?serie_id=
     */
    public function genererSeancesDepuisVolume(int $niveauId, Request $request)
    {
        $serieId = $request->query('serie_id') ?: null;
        $volumes = VolumeHoraire::where('niveau_id', $niveauId)->pluck('heures_semaine', 'matiere_id');

        $niveauMatieres = NiveauMatiere::where('niveau_id', $niveauId)
            ->where('serie_id', $serieId)
            ->withCount('seancesTypes')
            ->get();

        $crees = 0;
        foreach ($niveauMatieres as $nm) {
            if ($nm->seances_types_count > 0) {
                continue;
            }
            $heures = (int) round((float) ($volumes[$nm->matiere_id] ?? 0));
            if ($heures < 1) {
                continue;
            }
            SeanceType::create([
                'niveau_matiere_id' => $nm->id,
                'duree_minutes'     => 55,
                'nb_seances'        => $heures,
                'frequence'         => 'hebdomadaire',
                'ordre'             => 0,
            ]);
            $crees++;
        }

        return response()->json(['message' => "{$crees} découpage(s) créé(s).", 'crees' => $crees]);
    }

    private function validerSeance(Request $request, ?int $niveauMatiereFixe = null): array
    {
        $rules = [
            'duree_minutes' => 'required|integer|min:30|max:240',
            'nb_seances'    => 'required|integer|min:1|max:20',
            'frequence'     => ['nullable', Rule::in(SeanceType::FREQUENCES)],
            'tandem_code'   => 'nullable|string|max:20',
            'ordre'         => 'nullable|integer|min:0|max:50',
        ];
        if ($niveauMatiereFixe === null) {
            $rules['niveau_matiere_id'] = 'required|exists:niveau_matieres,id';
        }

        $data = $request->validate($rules);
        $data['niveau_matiere_id'] = $niveauMatiereFixe ?? $data['niveau_matiere_id'];
        $data['frequence'] ??= 'hebdomadaire';

        return $data;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private function statut(?int $taux): string
    {
        if ($taux === null) return 'non_defini';
        if ($taux >= 90)   return 'conforme';
        if ($taux >= 60)   return 'partiel';
        return 'insuffisant';
    }
}
