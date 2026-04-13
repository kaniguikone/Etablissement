<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demandes_inscription', function (Blueprint $table) {
            $table->id();

            // Origine
            $table->enum('origine', ['parent', 'etablissement'])->default('parent');
            $table->enum('statut', ['en_attente', 'validee', 'rejetee'])->default('en_attente');
            $table->string('motif_rejet')->nullable();
            $table->string('token', 64)->unique()->nullable(); // pour suivi parent

            // Infos enfant
            $table->string('nom_eleve');
            $table->string('prenoms_eleve');
            $table->string('date_naissance_eleve');
            $table->enum('genre_eleve', ['M', 'F']);
            $table->string('lieu_naissance_eleve')->nullable();
            $table->string('nationalite_eleve')->nullable();
            $table->string('adresse_eleve')->nullable();

            // Niveau souhaité
            $table->foreignId('niveau_id')->nullable()->constrained('niveaux')->nullOnDelete();
            $table->string('niveau_souhaite')->nullable(); // libellé libre si niveau_id absent

            // Infos parent
            $table->string('nom_parent');
            $table->string('prenom_parent');
            $table->string('numero_parent');
            $table->string('email_parent')->nullable();
            $table->string('relation_parent')->nullable();
            $table->string('profession_parent')->nullable();
            $table->string('adresse_parent')->nullable();

            // Lien vers élève créé après validation
            $table->foreignId('eleve_id')->nullable()->constrained('eleves')->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demandes_inscription');
    }
};
