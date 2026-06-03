<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemandeAcces extends Model
{
    protected $connection = 'mysql';
    protected $table      = 'demandes_acces';

    protected $fillable = [
        'nom_etablissement', 'type', 'code_ministere', 'ville', 'telephone',
        'nom_responsable', 'email', 'statut', 'notes', 'tenant_id', 'mot_de_passe_initial',
    ];

    public const TYPES = [
        'college'       => 'Collège',
        'lycee'         => 'Lycée',
        'lycee_complet' => 'Lycée Complet',
        'primaire'      => 'École Primaire',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
