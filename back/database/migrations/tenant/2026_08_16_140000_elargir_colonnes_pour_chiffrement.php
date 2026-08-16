<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Élargit en TEXT les colonnes qui vont recevoir le cast Eloquent 'encrypted'
 * (le blob chiffré+base64 dépasse largement une VARCHAR(30/191)).
 * SQLite n'impose aucune limite de longueur sur VARCHAR (typage dynamique) :
 * rien à faire côté tests, seul MySQL (dev/prod réels) a besoin de l'ALTER.
 */
return new class extends Migration
{
    private array $colonnes = [
        'users'        => ['telephone'],
        'etablissement' => ['telephone', 'telephone2'],
        'sante_eleves' => [
            'groupe_sanguin', 'allergies', 'medecin_nom', 'medecin_telephone',
            'contact_urgence_nom', 'contact_urgence_lien', 'contact_urgence_telephone',
            'assurance_compagnie', 'assurance_numero_police',
        ],
    ];

    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') return;

        foreach ($this->colonnes as $table => $champs) {
            foreach ($champs as $champ) {
                DB::statement("ALTER TABLE `{$table}` MODIFY `{$champ}` TEXT NULL");
            }
        }
    }

    public function down(): void
    {
        // Pas de rollback automatique : redescendre en VARCHAR tronquerait les valeurs
        // déjà chiffrées. À traiter manuellement si besoin.
    }
};
