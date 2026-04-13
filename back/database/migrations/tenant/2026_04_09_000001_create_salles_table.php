<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salles', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 100);
            $table->unsignedSmallInteger('capacite')->nullable();
            $table->enum('type', ['classe', 'labo', 'salle_info', 'gymnase', 'autre'])->default('classe');
            $table->string('batiment', 100)->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salles');
    }
};
