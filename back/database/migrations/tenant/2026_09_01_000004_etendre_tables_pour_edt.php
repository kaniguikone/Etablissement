<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Extensions additives des tables existantes pour le chantier « génération
 * d'emploi du temps » — Lot 0 (cf. docs/chantier-edt-lot0.md, décision C4 :
 * un seul ALTER groupé plutôt que six migrations add_x_to_y).
 *
 *  - matieres       : famille (regroupement MENET), couleur de fiche,
 *                     type de salle requis, indicateur « effort soutenu »
 *  - classes        : salle_id (salle attitrée — salle_classe reste en place,
 *                     legacy)
 *  - emploi_du_temps : plage_horaire_id (la saisie passe désormais par la
 *                     grille ; heure_debut/heure_fin restent la source de
 *                     vérité et sont copiés depuis la plage)
 *
 * Toutes les colonnes sont nullable / avec défaut : aucune ligne existante
 * n'est invalidée. Les FK sont ajoutées en brut sous MySQL uniquement
 * (SQLite des tests ne supporte pas ADD CONSTRAINT et ne valide pas les FK),
 * même pattern que 2026_07_13_000001_add_missing_foreign_keys_to_tenant_tables.
 */
return new class extends Migration
{
    private const FOREIGN_KEYS = [
        ['table' => 'classes', 'name' => 'classes_salle_id_foreign', 'column' => 'salle_id', 'references' => 'salles', 'onDelete' => 'set null'],
        ['table' => 'emploi_du_temps', 'name' => 'emploi_du_temps_plage_horaire_id_foreign', 'column' => 'plage_horaire_id', 'references' => 'plages_horaires', 'onDelete' => 'set null'],
        ['table' => 'plages_horaires', 'name' => 'plages_horaires_annee_scolaire_id_foreign', 'column' => 'annee_scolaire_id', 'references' => 'annees_scolaires', 'onDelete' => 'set null'],
        ['table' => 'enseignant_indisponibilites', 'name' => 'enseignant_indispo_annee_scolaire_id_foreign', 'column' => 'annee_scolaire_id', 'references' => 'annees_scolaires', 'onDelete' => 'set null'],
    ];

    public function up(): void
    {
        Schema::table('matieres', function (Blueprint $table) {
            // string (et non enum) : ajout d'enum via ALTER est fragile sous SQLite ;
            // les valeurs autorisées sont contrôlées applicativement (Matiere::FAMILLES,
            // Matiere::TYPES_SALLE).
            $table->string('famille', 20)->nullable();
            $table->string('couleur', 20)->nullable();
            $table->string('salle_type_requis', 20)->nullable();
            $table->boolean('effort_soutenu')->default(false);
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->unsignedBigInteger('salle_id')->nullable();
        });

        Schema::table('emploi_du_temps', function (Blueprint $table) {
            $table->unsignedBigInteger('plage_horaire_id')->nullable();
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            foreach (self::FOREIGN_KEYS as $fk) {
                if (! Schema::hasTable($fk['table']) || ! Schema::hasTable($fk['references'])) {
                    continue;
                }
                DB::statement(
                    "ALTER TABLE `{$fk['table']}` ADD CONSTRAINT `{$fk['name']}` ".
                    "FOREIGN KEY (`{$fk['column']}`) REFERENCES `{$fk['references']}` (`id`) ".
                    "ON DELETE {$fk['onDelete']}"
                );
            }
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            foreach (self::FOREIGN_KEYS as $fk) {
                DB::statement("ALTER TABLE `{$fk['table']}` DROP FOREIGN KEY `{$fk['name']}`");
            }
        }

        Schema::table('matieres', function (Blueprint $table) {
            $table->dropColumn(['famille', 'couleur', 'salle_type_requis', 'effort_soutenu']);
        });
        Schema::table('classes', function (Blueprint $table) {
            $table->dropColumn('salle_id');
        });
        Schema::table('emploi_du_temps', function (Blueprint $table) {
            $table->dropColumn('plage_horaire_id');
        });
    }
};
