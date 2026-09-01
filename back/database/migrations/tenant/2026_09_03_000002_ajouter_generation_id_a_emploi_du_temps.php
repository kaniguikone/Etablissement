<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rattache les créneaux à un scénario de génération et permet de les verrouiller
 * (chantier EDT — Lot 2). `generation_id = NULL` = EDT officiel courant, seul
 * visible des portails enseignant / parent / élève.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('emploi_du_temps', function (Blueprint $table) {
            $table->unsignedBigInteger('generation_id')->nullable()->index();
            $table->boolean('verrouille')->default(false);
        });

        if (DB::connection()->getDriverName() === 'mysql' && Schema::hasTable('edt_generations')) {
            DB::statement(
                'ALTER TABLE `emploi_du_temps` ADD CONSTRAINT `emploi_du_temps_generation_id_foreign` '
                .'FOREIGN KEY (`generation_id`) REFERENCES `edt_generations` (`id`) ON DELETE CASCADE'
            );
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE `emploi_du_temps` DROP FOREIGN KEY `emploi_du_temps_generation_id_foreign`');
        }
        Schema::table('emploi_du_temps', function (Blueprint $table) {
            $table->dropColumn(['generation_id', 'verrouille']);
        });
    }
};
