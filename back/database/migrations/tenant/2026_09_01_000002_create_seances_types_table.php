<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Découpage du volume horaire d'une matière (par niveau + série) en séances
 * concrètes : ex. Maths 3e « 2+1+1 » = une séance de 110 min + deux de 55 min
 * (chantier EDT — Lot 0.4). Rattaché à niveau_matieres, qui porte déjà le
 * triplet niveau/série/matière et le programme officiel.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seances_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('niveau_matiere_id')->constrained('niveau_matieres')->cascadeOnDelete();
            $table->unsignedSmallInteger('duree_minutes');            // 55 (1 plage), 110 (2 plages), 90 (1h30)
            $table->unsignedSmallInteger('nb_seances')->default(1);   // occurrences par semaine
            $table->enum('frequence', ['hebdomadaire', 'quinzaine'])->default('hebdomadaire');
            $table->string('tandem_code', 20)->nullable();           // 'PC-SVT', 'LV2'… lie deux séances-types
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->timestamps();

            $table->index('niveau_matiere_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seances_types');
    }
};
