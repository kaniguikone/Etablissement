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
        Schema::create('etablissement_matieres', function (Blueprint $table) {
            $table->id();
            // Pas d'etablissement_id : un tenant = un établissement
            $table->foreignId('matiere_id')
                  ->constrained('matieres')->onDelete('cascade');
            $table->timestamps();

            $table->unique('matiere_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('etablissement_matieres');
    }
};
