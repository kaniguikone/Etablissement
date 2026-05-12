<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('progressions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chapitre_id')->constrained('chapitres_matiere')->onDelete('cascade');
            $table->foreignId('classe_id')->constrained('classes')->onDelete('cascade');
            $table->foreignId('enseignant_id')->constrained('enseignants')->onDelete('cascade');
            $table->foreignId('periode_id')->constrained('periodes')->onDelete('cascade');
            $table->date('date_seance');
            $table->enum('statut', ['fait', 'en_cours', 'reporte']);
            $table->text('observations')->nullable();
            $table->timestamps();

            $table->unique(['chapitre_id', 'classe_id', 'enseignant_id', 'periode_id'], 'prog_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('progressions');
    }
};
