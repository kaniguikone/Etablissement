<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('niveau_matieres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('niveau_id')
                  ->constrained('niveaux')->onDelete('cascade');
            $table->foreignId('matiere_id')
                  ->constrained('matieres')->onDelete('cascade');
            // null = matière obligatoire, sinon rattachée à un groupe alternatif (LV2…)
            $table->foreignId('groupe_alternatif_id')
                  ->nullable()
                  ->constrained('groupes_alternatifs')->nullOnDelete();
            $table->boolean('obligatoire')->default(true);
            $table->timestamps();

            $table->unique(['niveau_id', 'matiere_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('niveau_matieres');
    }
};
