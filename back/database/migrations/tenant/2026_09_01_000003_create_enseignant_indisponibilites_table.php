<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Créneaux où un enseignant ne peut pas (bloquant) ou préfère ne pas
 * (preference) assurer de cours — vacataires, temps partiel, décharges
 * (chantier EDT — Lot 0.5). Soit une plage précise de la grille, soit un
 * intervalle horaire libre.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enseignant_indisponibilites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enseignant_id')->constrained('enseignants')->cascadeOnDelete();
            $table->foreignId('annee_scolaire_id')->nullable();
            $table->foreignId('plage_horaire_id')->nullable()->constrained('plages_horaires')->nullOnDelete();
            $table->enum('jour', ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']);
            $table->time('heure_debut')->nullable();
            $table->time('heure_fin')->nullable();
            $table->enum('type', ['bloquant', 'preference'])->default('bloquant');
            $table->string('motif', 120)->nullable();
            $table->timestamps();

            $table->index(['enseignant_id', 'jour']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enseignant_indisponibilites');
    }
};
