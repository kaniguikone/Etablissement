<?php

declare(strict_types=1);

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class BudgetDepense extends Model
{
    use Auditable;

    protected $fillable = [
        'annee_scolaire_id',
        'periode_id',
        'categorie_id',
        'libelle',
        'montant',
        'date_depense',
        'beneficiaire',
        'mode_paiement',
        'justificatif_path',
        'saisie_par_id',
    ];

    protected $casts = [
        'montant'      => 'float',
        'date_depense' => 'date:Y-m-d',
    ];

    public function anneeScolaire()
    {
        return $this->belongsTo(AnneeScolaire::class, 'annee_scolaire_id');
    }

    public function periode()
    {
        return $this->belongsTo(Periodes::class, 'periode_id');
    }

    public function categorie()
    {
        return $this->belongsTo(BudgetCategorieDepense::class, 'categorie_id');
    }

    public function saisiePar()
    {
        return $this->belongsTo(User::class, 'saisie_par_id');
    }

    /**
     * Solde disponible = dotations approuvées - dépenses déjà enregistrées, pour une année scolaire.
     * Jamais stocké : recalculé à chaque lecture (cf. FraisAnnexeController::index, même logique).
     */
    public static function soldeDisponible(int $anneeScolaireId): float
    {
        $octroye = (float) BudgetDotation::where('annee_scolaire_id', $anneeScolaireId)
            ->where('statut', BudgetDotation::STATUT_APPROUVEE)
            ->sum('montant_octroye');

        $depense = (float) static::where('annee_scolaire_id', $anneeScolaireId)->sum('montant');

        return $octroye - $depense;
    }
}
