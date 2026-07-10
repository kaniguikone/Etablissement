<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eleves', function (Blueprint $table) {
            $table->id();
            $table->string('matricule_eleve')->unique();
            $table->string('nom_eleve');
            $table->string('prenoms_eleve');
            $table->date('date_naissance_eleve');
            $table->enum('genre_eleve', ['M', 'F'])->nullable();
            $table->string('lieu_naissance_eleve')->nullable();
            $table->string('nationalite_eleve')->nullable();
            $table->string('adresse_eleve')->nullable();
            $table->string('photo_eleve')->nullable();
            $table->string('statut_eleve', 20)->default('actif'); // actif | inactif | abandon | decede
            $table->enum('langue2', ['espagnol', 'allemand', 'autre'])->nullable();
            $table->enum('statut_bourse', ['non_boursier', 'demi_boursier', 'boursier'])->default('non_boursier');
            $table->boolean('est_affecte')->default(false);
            $table->json('types_handicap')->nullable(); // tableau ex: ["moteur","malvoyant"]
            $table->enum('statut_orphelin', ['pere', 'mere', 'les_deux'])->nullable();

            $table->foreignId('classe_id')
                  ->constrained('classes')
                  ->onDelete('restrict')
                  ->onUpdate('restrict');

            $table->foreignId('parent_id')
                  ->nullable()
                  ->constrained('parents')
                  ->onDelete('restrict')
                  ->onUpdate('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eleves');
    }
};
