<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Toujours sur la connexion centrale (base MySQL principale)
    protected $connection = 'mysql';

    /**
     * Le serveur MySQL local a 'default_storage_engine' = MyISAM, donc toutes
     * les tables centrales ont été créées en MyISAM malgré les foreign()
     * définies dans les migrations : MySQL ignore silencieusement les clés
     * étrangères sur cet engine (pas d'erreur, juste pas de contrainte).
     * Conséquence concrète : la suppression d'un Tenant ne supprimait jamais
     * réellement sa ligne `domains` (voir incident du 2026-07-13).
     *
     * Ordre : tables référencées (groups, central_users, tenants) avant les
     * tables qui les référencent, pour pouvoir ajouter les FK après coup.
     */
    private const TABLES = [
        'groups',
        'central_users',
        'tenants',
        'group_admins',
        'domains',
        'abonnements_saas',
        'factures_saas',
        'central_parent_links',
        'central_enseignant_links',
        'demandes_acces',
        'config_saas',
        'tarifs_licence',
        'super_admins',
        'personal_access_tokens',
        'migrations',
    ];

    private const FOREIGN_KEYS = [
        ['table' => 'tenants', 'name' => 'tenants_group_id_foreign', 'column' => 'group_id', 'references' => 'groups', 'on' => 'id', 'onDelete' => 'set null'],
        ['table' => 'group_admins', 'name' => 'group_admins_group_id_foreign', 'column' => 'group_id', 'references' => 'groups', 'on' => 'id', 'onDelete' => 'cascade'],
        ['table' => 'domains', 'name' => 'domains_tenant_id_foreign', 'column' => 'tenant_id', 'references' => 'tenants', 'on' => 'id', 'onDelete' => 'cascade'],
        ['table' => 'abonnements_saas', 'name' => 'abonnements_saas_tenant_id_foreign', 'column' => 'tenant_id', 'references' => 'tenants', 'on' => 'id', 'onDelete' => 'cascade'],
        ['table' => 'factures_saas', 'name' => 'factures_saas_abonnement_id_foreign', 'column' => 'abonnement_id', 'references' => 'abonnements_saas', 'on' => 'id', 'onDelete' => 'cascade'],
        ['table' => 'central_parent_links', 'name' => 'central_parent_links_central_user_id_foreign', 'column' => 'central_user_id', 'references' => 'central_users', 'on' => 'id', 'onDelete' => 'cascade'],
        ['table' => 'central_parent_links', 'name' => 'central_parent_links_tenant_id_foreign', 'column' => 'tenant_id', 'references' => 'tenants', 'on' => 'id', 'onDelete' => 'cascade'],
        ['table' => 'central_enseignant_links', 'name' => 'central_enseignant_links_central_user_id_foreign', 'column' => 'central_user_id', 'references' => 'central_users', 'on' => 'id', 'onDelete' => 'cascade'],
        ['table' => 'central_enseignant_links', 'name' => 'central_enseignant_links_tenant_id_foreign', 'column' => 'tenant_id', 'references' => 'tenants', 'on' => 'id', 'onDelete' => 'cascade'],
    ];

    public function up(): void
    {
        if (app()->environment('testing')) return;

        foreach (self::TABLES as $table) {
            if (Schema::connection('mysql')->hasTable($table)) {
                DB::connection('mysql')->statement("ALTER TABLE `$table` ENGINE=InnoDB");
            }
        }

        foreach (self::FOREIGN_KEYS as $fk) {
            if (!Schema::connection('mysql')->hasTable($fk['table']) || $this->foreignKeyExists($fk['table'], $fk['name'])) {
                continue;
            }

            DB::connection('mysql')->statement(
                "ALTER TABLE `{$fk['table']}` ADD CONSTRAINT `{$fk['name']}` " .
                "FOREIGN KEY (`{$fk['column']}`) REFERENCES `{$fk['references']}` (`{$fk['on']}`) " .
                "ON DELETE {$fk['onDelete']}"
            );
        }
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        foreach (self::FOREIGN_KEYS as $fk) {
            if (Schema::connection('mysql')->hasTable($fk['table']) && $this->foreignKeyExists($fk['table'], $fk['name'])) {
                DB::connection('mysql')->statement("ALTER TABLE `{$fk['table']}` DROP FOREIGN KEY `{$fk['name']}`");
            }
        }

        foreach (self::TABLES as $table) {
            if (Schema::connection('mysql')->hasTable($table)) {
                DB::connection('mysql')->statement("ALTER TABLE `$table` ENGINE=MyISAM");
            }
        }
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        $result = DB::connection('mysql')->select(
            'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = "FOREIGN KEY"',
            [$table, $constraintName]
        );

        return count($result) > 0;
    }
};
