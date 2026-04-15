<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('niveau_matieres', function (Blueprint $table) {
            // Supprimer l'ancienne contrainte unique (niveau_id, matiere_id)
            $table->dropUnique(['niveau_id', 'matiere_id']);

            // Ajouter serie_id nullable : null = s'applique à tout le niveau
            $table->foreignId('serie_id')
                  ->nullable()
                  ->after('niveau_id')
                  ->constrained('series')->nullOnDelete();

            // Nouvelle contrainte unique : (niveau_id, serie_id, matiere_id)
            $table->unique(['niveau_id', 'serie_id', 'matiere_id']);
        });
    }

    public function down(): void
    {
        Schema::table('niveau_matieres', function (Blueprint $table) {
            $table->dropUnique(['niveau_id', 'serie_id', 'matiere_id']);
            $table->dropForeign(['serie_id']);
            $table->dropColumn('serie_id');
            $table->unique(['niveau_id', 'matiere_id']);
        });
    }
};
