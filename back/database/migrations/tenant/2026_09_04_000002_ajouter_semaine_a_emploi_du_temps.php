<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Quinzaine : un créneau peut n'avoir lieu qu'une semaine sur deux (chantier
 * EDT — Lot 4). `toutes` = chaque semaine ; `A` / `B` = semaine paire / impaire.
 * Deux créneaux au même moment ne sont pas en conflit si l'un est en A et
 * l'autre en B (ex. Physique-Chimie semaine A / SVT semaine B au 1er cycle).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('emploi_du_temps', function (Blueprint $table) {
            $table->string('semaine', 6)->default('toutes');     // toutes | A | B
            $table->unsignedBigInteger('groupe_id')->nullable(); // groupe pédagogique (LV2, dédoublement)
        });
        Schema::table('groupes_pedagogiques', function (Blueprint $table) {
            $table->string('semaine', 6)->default('toutes');
        });
    }

    public function down(): void
    {
        Schema::table('emploi_du_temps', function (Blueprint $table) {
            $table->dropColumn(['semaine', 'groupe_id']);
        });
        Schema::table('groupes_pedagogiques', function (Blueprint $table) {
            $table->dropColumn('semaine');
        });
    }
};
