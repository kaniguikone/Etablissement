<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enseignants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('central_user_id')->nullable();
            $table->string('matricule_enseignant')->unique();
            $table->string('nom_enseignant');
            $table->string('prenoms_enseignant');
            $table->enum('genre_enseignant', ['M', 'F'])->nullable();
            $table->string('telephone_enseignant')->nullable();
            $table->string('email_enseignant')->nullable();
            $table->date('date_naissance_enseignant')->nullable();
            $table->date('date_embauche_enseignant')->nullable();
            $table->enum('statut_enseignant', ['CDI', 'CDD', 'Stagiaire', 'Vacataire'])->nullable();
            $table->string('password')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enseignants');
    }
};
