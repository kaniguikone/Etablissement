<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assiduites', function (Blueprint $table) {
            $table->id();
            $table->date('date_assiduite');
            $table->time('heure_debut')->nullable();
            $table->time('heure_fin')->nullable();
            $table->decimal('duree', 4, 2)->nullable();
            $table->enum('statut', ['present', 'absent', 'retard']);
            $table->string('remarque')->nullable();

            $table->unsignedBigInteger('eleve_id');
            $table->foreign('eleve_id')
                ->references('id')
                ->on('eleves')
                ->onDelete('cascade')
                ->onUpdate('cascade');

            $table->unsignedBigInteger('matiere_id');
            $table->foreign('matiere_id')
                ->references('id')
                ->on('matieres')
                ->onDelete('restrict')
                ->onUpdate('restrict');

            $table->unsignedBigInteger('periode_id');
            $table->foreign('periode_id')
                ->references('id')
                ->on('periodes')
                ->onDelete('restrict')
                ->onUpdate('restrict');

            $table->unique(['eleve_id', 'matiere_id', 'periode_id', 'date_assiduite']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assiduites');
    }
};
