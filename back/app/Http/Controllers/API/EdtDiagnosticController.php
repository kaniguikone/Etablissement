<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Classe;
use App\Models\EnseignantIndisponibilite;
use App\Models\Matiere;
use App\Models\NiveauMatiere;
use App\Models\PlageHoraire;
use Illuminate\Support\Facades\DB;

/**
 * Vérifie que le paramétrage nécessaire à la génération d'un emploi du temps
 * est complet — chantier EDT, Lot 0.6.
 */
class EdtDiagnosticController extends Controller
{
    public function index()
    {
        $blocs = [
            $this->bloc('grille', ...$this->grille()),
            $this->bloc('familles', ...$this->familles()),
            $this->bloc('salles_classe', ...$this->sallesClasse()),
            $this->bloc('capacite', ...$this->capacite()),
            $this->bloc('affectations', ...$this->affectations()),
            $this->bloc('seances', ...$this->seances()),
            $this->bloc('groupes', ...$this->groupes()),
            $this->bloc('indispos', ...$this->indispos()),
        ];

        return response()->json([
            'pret' => collect($blocs)->every(fn ($b) => $b['ok']),
            'blocs' => $blocs,
        ]);
    }

    private function bloc(string $code, bool $ok, ?string $detail): array
    {
        return ['code' => $code, 'ok' => $ok, 'detail' => $detail];
    }

    private function grille(): array
    {
        $cours = PlageHoraire::cours()->actives()->count();
        $jours = PlageHoraire::cours()->actives()->whereNotNull('jour')->distinct()->count('jour');

        return $cours >= 4
            ? [true, "{$cours} plages de cours".($jours ? " sur {$jours} jour(s)" : '')]
            : [false, 'Grille horaire incomplète : définissez les plages de cours'];
    }

    private function familles(): array
    {
        $sans = Matiere::whereNull('famille')->pluck('abbr_matiere');

        return $sans->isEmpty()
            ? [true, null]
            : [false, $sans->count().' matière(s) sans famille : '.$sans->take(8)->implode(', ')];
    }

    private function sallesClasse(): array
    {
        $sans = Classe::whereNull('salle_id')->pluck('nom_classe');

        return $sans->isEmpty()
            ? [true, null]
            : [false, $sans->count().' classe(s) sans salle attitrée : '.$sans->take(6)->implode(', ')];
    }

    private function capacite(): array
    {
        $mauvaises = Classe::query()
            ->join('salles', 'salles.id', '=', 'classes.salle_id')
            ->whereNotNull('classes.effectif_max_classe')
            ->whereNotNull('salles.capacite')
            ->whereColumn('salles.capacite', '<', 'classes.effectif_max_classe')
            ->pluck('classes.nom_classe');

        return $mauvaises->isEmpty()
            ? [true, null]
            : [false, $mauvaises->count().' classe(s) dans une salle trop petite : '.$mauvaises->take(6)->implode(', ')];
    }

    private function affectations(): array
    {
        // Matières obligatoires du programme sans aucun enseignant affecté dans une classe du niveau.
        $manquantes = DB::table('niveau_matieres as nm')
            ->join('classes as c', 'c.niveau_id', '=', 'nm.niveau_id')
            ->leftJoin('classe_enseignant_matiere as cem', function ($j) {
                $j->on('cem.classe_id', '=', 'c.id')->on('cem.matiere_id', '=', 'nm.matiere_id');
            })
            ->join('matieres as m', 'm.id', '=', 'nm.matiere_id')
            ->where('nm.obligatoire', true)
            ->whereNull('cem.id')
            ->distinct()
            ->limit(6)
            ->get(['c.nom_classe', 'm.libelle_matiere'])
            ->map(fn ($r) => "{$r->nom_classe} · {$r->libelle_matiere}");

        return $manquantes->isEmpty()
            ? [true, null]
            : [false, 'Affectations manquantes : '.$manquantes->implode(' ; ')];
    }

    private function seances(): array
    {
        $total = NiveauMatiere::count();
        if ($total === 0) {
            return [false, 'Aucun programme (niveau/matières) configuré'];
        }
        $sansSeance = NiveauMatiere::doesntHave('seancesTypes')->count();

        return $sansSeance === 0
            ? [true, 'Découpage en séances défini pour tout le programme']
            : [false, "{$sansSeance}/{$total} matière(s) du programme sans découpage en séances"];
    }

    private function groupes(): array
    {
        $total = \App\Models\GroupePedagogique::count();
        if ($total === 0) {
            return [true, 'Aucun groupe (LV2 / dédoublement) — facultatif'];
        }
        $sansProf = \App\Models\GroupePedagogique::whereNull('enseignant_id')
            ->with('classe:id,nom_classe')->get();

        return $sansProf->isEmpty()
            ? [true, "{$total} groupe(s) configuré(s)"]
            : [false, $sansProf->count().' groupe(s) sans enseignant : '
                .$sansProf->map(fn ($g) => "{$g->classe?->nom_classe} · {$g->libelle}")->take(5)->implode(', ')];
    }

    private function indispos(): array
    {
        // Simple indicateur : au moins vérifié une fois qu'il n'y a pas d'incohérence.
        $count = EnseignantIndisponibilite::count();

        return [true, $count > 0 ? "{$count} indisponibilité(s) renseignée(s)" : 'Aucune indisponibilité (facultatif)'];
    }
}
