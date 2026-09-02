<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Groupes pédagogiques : sous-ensembles d'une classe suivant une matière avec
 * un enseignant distinct — LV2 (Allemand / Espagnol), dédoublements de langues
 * ou de sciences (chantier EDT — Lot 4).
 *
 * Les groupes partageant le même `parallele_code` sont enseignés en même temps
 * (la classe se scinde) ; le générateur les place sur le même créneau, dans des
 * salles et avec des enseignants différents.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groupes_pedagogiques', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classe_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('matiere_id')->constrained('matieres')->cascadeOnDelete();
            $table->foreignId('enseignant_id')->nullable()->constrained('enseignants')->nullOnDelete();
            $table->string('libelle', 80);                 // "Allemand", "Espagnol", "Groupe 1"…
            $table->string('parallele_code', 30);          // groupes simultanés d'une même classe
            $table->unsignedSmallInteger('effectif')->nullable();
            $table->unsignedSmallInteger('nb_seances')->default(0);   // 0 = hérite du volume horaire du niveau
            $table->unsignedSmallInteger('duree_minutes')->default(55);
            $table->timestamps();

            $table->index(['classe_id', 'parallele_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('groupes_pedagogiques');
    }
};
