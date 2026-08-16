<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Table centrale (pas tenant) — voir 2026_08_16_140000 côté tenant pour le contexte.
return new class extends Migration
{
    protected $connection = 'mysql';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        DB::connection('mysql')->statement('ALTER TABLE `demandes_acces` MODIFY `telephone` TEXT NULL');
    }

    public function down(): void
    {
        // Pas de rollback automatique : voir migration tenant équivalente.
    }
};
