<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('volumes_horaires', function (Blueprint $table) {
            $table->id();
            $table->foreignId('niveau_id')->constrained('niveaux')->onDelete('cascade');
            $table->foreignId('matiere_id')->constrained('matieres')->onDelete('cascade');
            $table->decimal('heures_semaine', 4, 1); // ex: 5.0 ou 1.5
            $table->unsignedSmallInteger('semaines_annee')->default(36);
            $table->timestamps();

            $table->unique(['niveau_id', 'matiere_id'], 'vh_niveau_matiere_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('volumes_horaires');
    }
};
