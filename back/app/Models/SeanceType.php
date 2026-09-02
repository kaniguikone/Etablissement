<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Une ligne de découpage du volume horaire d'une matière en séances concrètes
 * pour un niveau/série donné (cf. chantier EDT — Lot 0.4).
 */
class SeanceType extends Model
{
    protected $table = 'seances_types';

    protected $fillable = [
        'niveau_matiere_id', 'duree_minutes', 'nb_seances',
        'frequence', 'tandem_code', 'ordre',
    ];

    protected $casts = [
        'duree_minutes' => 'integer',
        'nb_seances' => 'integer',
        'ordre' => 'integer',
    ];

    public const FREQUENCES = ['hebdomadaire', 'quinzaine'];

    public function niveauMatiere()
    {
        return $this->belongsTo(NiveauMatiere::class, 'niveau_matiere_id');
    }

    /**
     * Heures/semaine représentées par cette ligne (une séance quinzaine
     * ne compte que pour moitié dans le volume hebdomadaire moyen).
     */
    public function getHeuresSemaineAttribute(): float
    {
        $coef = $this->frequence === 'quinzaine' ? 0.5 : 1.0;

        return round(($this->duree_minutes / 60) * $this->nb_seances * $coef, 2);
    }
}
