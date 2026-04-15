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
        Schema::create('classe_matieres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classe_id')
                  ->constrained('classes')->onDelete('cascade');
            $table->foreignId('matiere_id')
                  ->constrained('matieres')->onDelete('cascade');
            // Si la matière appartient à un groupe alternatif, on trace le groupe résolu
            $table->foreignId('groupe_alternatif_id')
                  ->nullable()
                  ->constrained('groupes_alternatifs')->nullOnDelete();
            $table->timestamps();

            $table->unique(['classe_id', 'matiere_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('classe_matieres');
    }
};
