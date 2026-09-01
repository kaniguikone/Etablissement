<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Grille horaire de l'établissement : plages de cours, récréations et pause
 * méridienne. Base du montage d'emploi du temps (chantier EDT — Lot 0.2).
 * Une plage de type 'cours' est un « slot » plaçable ; une séance de 2h en
 * occupe deux contiguës. jour = null signifie « tous les jours ouvrés ».
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plages_horaires', function (Blueprint $table) {
            $table->id();
            // FK ajoutée dans 2026_09_01_000004 (parité avec le reste des tables tenant)
            $table->foreignId('annee_scolaire_id')->nullable();
            $table->string('libelle', 50);
            $table->enum('jour', ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'])->nullable();
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->enum('type', ['cours', 'recreation', 'pause_midi'])->default('cours');
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->index(['jour', 'ordre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plages_horaires');
    }
};
