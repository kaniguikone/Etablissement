<?php

declare(strict_types=1);

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class BudgetDotation extends Model
{
    use Auditable;

    const STATUT_BROUILLON = 'brouillon';
    const STATUT_SOUMISE   = 'soumise';
    const STATUT_APPROUVEE = 'approuvee';
    const STATUT_REJETEE   = 'rejetee';

    const VALIDEUR_GROUP_ADMIN = 'group_admin';
    const VALIDEUR_USER        = 'user';

    protected $fillable = [
        'annee_scolaire_id',
        'demandeur_id',
        'reference',
        'montant_demande',
        'motif',
        'montant_octroye',
        'statut',
        'validee_par_type',
        'validee_par_id',
        'validee_par_nom',
        'validee_le',
        'commentaire_validation',
    ];

    protected $casts = [
        'montant_demande' => 'float',
        'montant_octroye' => 'float',
        'validee_le'       => 'datetime',
    ];

    public function anneeScolaire()
    {
        return $this->belongsTo(AnneeScolaire::class, 'annee_scolaire_id');
    }

    public function demandeur()
    {
        return $this->belongsTo(User::class, 'demandeur_id');
    }
}
