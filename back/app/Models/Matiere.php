<?php

namespace App\Models;

use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Matiere extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'abbr_matiere', 'libelle_matiere', 'description_matiere',
        'famille', 'couleur', 'salle_type_requis', 'effort_soutenu',
    ];

    protected $casts = ['effort_soutenu' => 'boolean'];

    /**
     * Familles de matières : regroupement qui porte les règles pédagogiques
     * MENET (2h consécutives, tandem PC/SVT, HG jamais 2h…) et le code couleur
     * des fiches, malgré la granularité fine du référentiel (« Français » =
     * Composition / Orthographe / Oral). Cf. chantier EDT — décision C1.
     * Valeur => [libellé, couleur de fiche MENET].
     */
    public const FAMILLES = [
        'francais' => ['Français', '#F6E05E'],                  // jaune
        'maths'    => ['Mathématiques', '#FC8181'],             // rouge
        'hist_geo' => ['Histoire-Géographie', '#63B3ED'],       // bleu
        'anglais'  => ['Anglais (LV1)', '#F6AD9B'],             // rose
        'lv2'      => ['LV2 (All./Esp.)', '#B794F4'],           // violet
        'philo'    => ['Philosophie', '#F6AD55'],               // orange
        'pc'       => ['Physique-Chimie', '#68D391'],           // vert
        'svt'      => ['SVT', '#B7791F'],                       // marron
        'eps'      => ['EPS', '#F6AD55'],                       // orange
        'edhc'     => ['EDHC', '#A0AEC0'],                      // gris
        'arts_em'  => ['Arts / Éduc. musicale / TM', '#FFFFFF'], // blanc
        'tic'      => ['TIC / Informatique', '#CBD5E0'],
        'autre'    => ['Autre', '#E2E8F0'],
    ];

    public const TYPES_SALLE = ['labo', 'salle_info', 'gymnase'];

    /** Suggestion de famille à partir de l'abréviation (assistant de config). */
    public const SUGGESTIONS_FAMILLE = [
        'CFR' => 'francais', 'OTG' => 'francais', 'OFR' => 'francais', 'FR' => 'francais', 'FRAN' => 'francais',
        'MATHS' => 'maths', 'MATH' => 'maths',
        'HG' => 'hist_geo', 'HIST' => 'hist_geo', 'GEO' => 'hist_geo',
        'ANG' => 'anglais', 'ANGL' => 'anglais',
        'ESP' => 'lv2', 'ALL' => 'lv2',
        'PHILO' => 'philo', 'PHIL' => 'philo',
        'SPC' => 'pc', 'SPHY' => 'pc', 'PC' => 'pc', 'PHCH' => 'pc',
        'SVT' => 'svt',
        'EPS' => 'eps',
        'EDHC' => 'edhc',
        'ARTS' => 'arts_em', 'MUS' => 'arts_em', 'EM' => 'arts_em', 'TM' => 'arts_em', 'AP' => 'arts_em',
        'TIC' => 'tic', 'INFO' => 'tic',
    ];

    public function enseignants()
    {
        return $this->belongsToMany(Enseignant::class, 'classe_enseignant_matiere');
    }

    public function classes()
    {
        return $this->belongsToMany(Classe::class, 'classe_enseignant_matiere');
    }
}
