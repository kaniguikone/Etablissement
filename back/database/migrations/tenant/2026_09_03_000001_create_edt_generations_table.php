<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Scénarios d'emploi du temps produits par le générateur (chantier EDT —
 * Lot 2). Un scénario = un ensemble de créneaux `emploi_du_temps` portant le
 * même `generation_id`. Le scénario publié voit ses créneaux repasser à
 * `generation_id = NULL` (= EDT officiel courant).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('edt_generations', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->foreignId('annee_scolaire_id')->nullable();
            $table->enum('statut', ['en_cours', 'termine', 'echec', 'publie', 'archive'])->default('en_cours');
            $table->json('parametres')->nullable();
            $table->integer('score')->nullable();
            $table->json('diagnostic')->nullable();
            $table->unsignedInteger('duree_ms')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edt_generations');
    }
};
