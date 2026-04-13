<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('num_classe');
            $table->string('nom_classe');
            $table->string('abbr_classe');
            $table->string('salle_classe')->nullable();
            $table->unsignedInteger('effectif_max_classe')->nullable();

            $table->foreignId('niveau_id')
                  ->constrained('niveaux')
                  ->onDelete('restrict')
                  ->onUpdate('restrict');

            $table->foreignId('professeur_principal_id')
                  ->nullable()
                  ->constrained('enseignants')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
