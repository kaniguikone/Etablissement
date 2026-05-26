<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HelpArticle extends Model
{
    protected $fillable = ['titre', 'contenu', 'module', 'categorie', 'ordre', 'actif'];

    protected $casts = ['actif' => 'boolean', 'ordre' => 'integer'];

    public const MODULES = [
        'dashboard'      => 'Tableau de bord',
        'eleves'         => 'Élèves',
        'enseignants'    => 'Enseignants',
        'classes'        => 'Classes & Niveaux',
        'paiements'      => 'Paiements & Scolarité',
        'frais_annexes'  => 'Frais annexes',
        'bulletins'      => 'Bulletins & Notes',
        'assiduites'     => 'Assiduités',
        'emploi_du_temps'=> 'Emploi du temps',
        'sanctions'      => 'Sanctions & Discipline',
        'conseil'        => 'Conseil de classe',
        'communication'  => 'Communication',
        'statistiques'   => 'Statistiques',
        'export'         => 'Exports & Rapports',
        'parametrage'    => 'Paramétrage',
        'utilisateurs'   => 'Utilisateurs & Rôles',
        'inscriptions'   => 'Inscriptions',
    ];

    public const CATEGORIES = [
        'prise_en_main' => 'Prise en main',
        'tutoriel'      => 'Tutoriel',
        'faq'           => 'FAQ',
        'astuce'        => 'Astuce',
    ];
}
