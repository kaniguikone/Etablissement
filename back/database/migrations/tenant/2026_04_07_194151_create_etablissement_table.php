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
        Schema::create('etablissement', function (Blueprint $table) {
            $table->id();
            $table->string('nom')->default('Mon Etablissement');
            $table->string('slogan')->nullable();
            $table->string('logo')->nullable();          // chemin stockage
            $table->string('adresse')->nullable();
            $table->string('ville')->nullable();
            $table->string('bp')->nullable();            // boîte postale
            $table->string('telephone')->nullable();
            $table->string('telephone2')->nullable();
            $table->string('email')->nullable();
            $table->string('site_web')->nullable();
            $table->string('pays')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('etablissement');
    }
};
