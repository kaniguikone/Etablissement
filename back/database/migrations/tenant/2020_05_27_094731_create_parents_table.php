<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parents', function (Blueprint $table) {
            $table->id();
            $table->string('numero_parent')->unique();
            $table->string('nom_parent')->nullable();
            $table->string('prenom_parent')->nullable();
            $table->string('email_parent')->nullable();
            $table->string('adresse_parent')->nullable();
            $table->enum('relation_parent', ['Père', 'Mère', 'Tuteur', 'Autre'])->nullable();
            $table->string('profession_parent')->nullable();
            $table->string('password')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parents');
    }
};
