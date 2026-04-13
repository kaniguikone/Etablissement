<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('passage_classes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('annee_scolaire_id');
            $table->unsignedBigInteger('eleve_id');
            $table->unsignedBigInteger('classe_actuelle_id');          // classe de l'année qui se termine
            $table->unsignedBigInteger('classe_suivante_id')->nullable(); // null = diplômé/sorti
            // promu | redoublant | diplome | sorti
            $table->string('decision', 20)->default('promu');
            $table->string('remarque', 255)->nullable();
            // true = passage effectivement appliqué sur l'élève
            $table->boolean('applique')->default(false);
            $table->timestamps();

            $table->foreign('annee_scolaire_id')->references('id')->on('annees_scolaires')->cascadeOnDelete();
            $table->foreign('eleve_id')->references('id')->on('eleves')->cascadeOnDelete();
            $table->foreign('classe_actuelle_id')->references('id')->on('classes')->cascadeOnDelete();
            $table->foreign('classe_suivante_id')->references('id')->on('classes')->nullOnDelete();

            $table->unique(['annee_scolaire_id', 'eleve_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passage_classes');
    }
};
