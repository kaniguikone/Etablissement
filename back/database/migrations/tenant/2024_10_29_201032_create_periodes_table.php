<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('periodes', function (Blueprint $table) {
            $table->id();
            // FK vers 'annees_scolaires' ajoutée dans 2026_07_13_000001 (table créée bien plus tard chronologiquement)
            $table->foreignId('annee_scolaire_id')->nullable();
            $table->string('libelle_periode');
            $table->string('abbr_libelle_periode');
            $table->string('code_periode', 10)->nullable();
            $table->string('annee');
            $table->date('date_debut');
            $table->date('date_fin');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('periodes');
    }
};
