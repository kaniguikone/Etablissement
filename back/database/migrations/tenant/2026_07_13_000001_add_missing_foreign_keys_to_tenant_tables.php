<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Certaines migrations (classes, periodes, emploi_du_temps, paiements,
     * niveau_matieres) référencent des tables (series, annees_scolaires,
     * salles) créées plus tard chronologiquement. Sous MyISAM (moteur par
     * défaut du serveur MySQL local), MySQL ignore silencieusement les FK
     * invalides — aucune erreur, juste pas de contrainte. Passer en InnoDB
     * fait échouer ces migrations pour tout nouveau tenant. Les FK ont donc
     * été retirées des migrations d'origine et sont recréées ici, une fois
     * toutes les tables référencées garanties existantes.
     */
    private const FOREIGN_KEYS = [
        ['table' => 'classes', 'name' => 'classes_serie_id_foreign', 'column' => 'serie_id', 'references' => 'series', 'on' => 'id', 'onDelete' => 'set null'],
        ['table' => 'periodes', 'name' => 'periodes_annee_scolaire_id_foreign', 'column' => 'annee_scolaire_id', 'references' => 'annees_scolaires', 'on' => 'id', 'onDelete' => 'set null'],
        ['table' => 'emploi_du_temps', 'name' => 'emploi_du_temps_annee_scolaire_id_foreign', 'column' => 'annee_scolaire_id', 'references' => 'annees_scolaires', 'on' => 'id', 'onDelete' => 'set null'],
        ['table' => 'emploi_du_temps', 'name' => 'emploi_du_temps_salle_id_foreign', 'column' => 'salle_id', 'references' => 'salles', 'on' => 'id', 'onDelete' => 'set null'],
        ['table' => 'paiements', 'name' => 'paiements_annee_scolaire_id_foreign', 'column' => 'annee_scolaire_id', 'references' => 'annees_scolaires', 'on' => 'id', 'onDelete' => 'set null'],
        ['table' => 'niveau_matieres', 'name' => 'niveau_matieres_serie_id_foreign', 'column' => 'serie_id', 'references' => 'series', 'on' => 'id', 'onDelete' => 'set null'],
    ];

    public function up(): void
    {
        // SQLite (tests) ne supporte pas l'ajout de FK via ALTER TABLE et n'a
        // pas information_schema — la contrainte n'y a jamais été nécessaire
        // puisque SQLite ne valide pas l'existence de la table référencée.
        if (DB::connection()->getDriverName() !== 'mysql') return;

        foreach (self::FOREIGN_KEYS as $fk) {
            if (!Schema::hasTable($fk['table']) || !Schema::hasTable($fk['references']) || $this->foreignKeyExists($fk['table'], $fk['name'])) {
                continue;
            }

            DB::statement(
                "ALTER TABLE `{$fk['table']}` ADD CONSTRAINT `{$fk['name']}` " .
                "FOREIGN KEY (`{$fk['column']}`) REFERENCES `{$fk['references']}` (`{$fk['on']}`) " .
                "ON DELETE {$fk['onDelete']}"
            );
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') return;

        foreach (self::FOREIGN_KEYS as $fk) {
            if (Schema::hasTable($fk['table']) && $this->foreignKeyExists($fk['table'], $fk['name'])) {
                DB::statement("ALTER TABLE `{$fk['table']}` DROP FOREIGN KEY `{$fk['name']}`");
            }
        }
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        $result = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = "FOREIGN KEY"',
            [$table, $constraintName]
        );

        return count($result) > 0;
    }
};
