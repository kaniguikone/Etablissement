<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TarifLicence extends Model
{
    protected $connection = 'mysql';
    protected $table      = 'tarifs_licence';

    protected $fillable = ['tranche_min', 'tranche_max', 'prix_par_eleve', 'ordre', 'actif'];

    protected $casts = ['actif' => 'boolean', 'tranche_max' => 'integer'];

    /**
     * Calcule le montant annuel pour un effectif donné.
     * Retourne aussi la tranche appliquée et le plancher minimum.
     */
    public static function calculer(int $effectif): array
    {
        $tranches = self::where('actif', true)->orderBy('ordre')->get();
        $plancher = (int) ConfigSaas::valeur('plancher_minimum', 500000);

        $tranche = $tranches->first(function ($t) use ($effectif) {
            return $effectif >= $t->tranche_min
                && ($t->tranche_max === null || $effectif <= $t->tranche_max);
        });

        if (! $tranche) {
            return ['montant' => $plancher, 'prix_par_eleve' => 0, 'tranche' => null, 'plancher_applique' => true];
        }

        $montant          = $effectif * $tranche->prix_par_eleve;
        $plancherApplique = $montant < $plancher;
        $montantFinal     = max($montant, $plancher);

        return [
            'montant'          => $montantFinal,
            'montant_brut'     => $montant,
            'prix_par_eleve'   => $tranche->prix_par_eleve,
            'tranche'          => $tranche,
            'plancher_applique' => $plancherApplique,
        ];
    }
}
