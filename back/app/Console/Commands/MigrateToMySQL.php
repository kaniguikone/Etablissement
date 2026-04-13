<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PDO;

class MigrateToMySQL extends Command
{
    protected $signature   = 'db:sqlite-to-mysql';
    protected $description = 'Copie toutes les données SQLite vers MySQL';

    public function handle(): int
    {
        $sqlitePath = database_path('database.sqlite');

        if (!file_exists($sqlitePath)) {
            $this->error("Fichier SQLite introuvable : {$sqlitePath}");
            return 1;
        }

        $this->info("Connexion à SQLite : {$sqlitePath}");
        $sqlite = new PDO("sqlite:{$sqlitePath}");
        $sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Récupérer toutes les tables SQLite (sauf les tables système)
        $tables = $sqlite->query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )->fetchAll(PDO::FETCH_COLUMN);

        $this->info('Tables trouvées : ' . implode(', ', $tables));

        // Désactiver les contraintes FK dans MySQL
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        $erreurs = 0;
        foreach ($tables as $table) {
            try {
                $rows = $sqlite->query("SELECT * FROM \"{$table}\"")->fetchAll(PDO::FETCH_ASSOC);

                if (empty($rows)) {
                    $this->line("  <fg=gray>→ {$table} : vide, ignoré</>");
                    continue;
                }

                // Vider la table MySQL avant insertion
                DB::table($table)->truncate();

                // Convertir les dates DD/MM/YYYY → YYYY-MM-DD
                $rows = array_map(fn($row) => $this->convertirDates($row), $rows);

                // Insérer par lots de 100
                foreach (array_chunk($rows, 100) as $chunk) {
                    DB::table($table)->insert($chunk);
                }

                $this->info("  ✓ {$table} : " . count($rows) . ' lignes copiées');
            } catch (\Throwable $e) {
                $this->warn("  ✗ {$table} : " . $e->getMessage());
                $erreurs++;
            }
        }

        // Réactiver les contraintes FK
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        if ($erreurs === 0) {
            $this->info('Migration SQLite → MySQL terminée avec succès.');
        } else {
            $this->warn("Migration terminée avec {$erreurs} erreur(s) — vérifier ci-dessus.");
        }

        return 0;
    }

    private function convertirDates(array $row): array
    {
        foreach ($row as $col => $val) {
            if (is_string($val) && preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $val)) {
                [$j, $m, $a] = explode('/', $val);
                $row[$col] = "{$a}-{$m}-{$j}";
            }
        }
        return $row;
    }
}
