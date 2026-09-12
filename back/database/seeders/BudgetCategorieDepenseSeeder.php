<?php

namespace Database\Seeders;

use App\Models\BudgetCategorieDepense;
use Illuminate\Database\Seeder;

class BudgetCategorieDepenseSeeder extends Seeder
{
    /**
     * Catégories courantes pour le budget de fonctionnement d'un établissement
     * (dépenses du Directeur d'Études). Idempotent (updateOrCreate par nom) —
     * rejouable sans dupliquer, y compris sur un tenant qui a déjà ses propres
     * catégories créées manuellement via l'écran de paramétrage.
     */
    public function run(): void
    {
        $categories = [
            'Fournitures scolaires',
            'Entretien et maintenance',
            'Petit matériel et consommables',
            'Transport',
            'Événements et activités scolaires',
            'Communication et impression',
            'Frais postaux et administratifs',
            'Réparations et interventions techniques',
            'Restauration',
            'Urgences',
            'Divers',
        ];

        foreach ($categories as $nom) {
            BudgetCategorieDepense::updateOrCreate(['nom' => $nom], ['actif' => true]);
        }
    }
}
