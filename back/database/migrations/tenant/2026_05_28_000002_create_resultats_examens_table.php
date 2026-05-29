<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resultats_examens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('annee_scolaire_id')->constrained('annees_scolaires')->onDelete('cascade');
            $table->enum('type_examen', ['bepc', 'bac']);
            $table->unsignedInteger('nb_inscrits')->default(0);
            $table->unsignedInteger('nb_inscrits_filles')->default(0);
            $table->unsignedInteger('nb_presentes')->default(0);
            $table->unsignedInteger('nb_presentes_filles')->default(0);
            $table->unsignedInteger('nb_admis')->default(0);
            $table->unsignedInteger('nb_admis_filles')->default(0);
            $table->timestamps();

            $table->unique(['annee_scolaire_id', 'type_examen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resultats_examens');
    }
};
