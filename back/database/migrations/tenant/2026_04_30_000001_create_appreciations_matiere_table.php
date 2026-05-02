<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appreciations_matiere', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('eleve_id');
            $table->unsignedBigInteger('matiere_id');
            $table->unsignedBigInteger('periode_id');
            $table->string('appreciation', 300)->nullable();
            $table->unsignedBigInteger('enseignant_id')->nullable();
            $table->timestamps();

            $table->unique(['eleve_id', 'matiere_id', 'periode_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appreciations_matiere');
    }
};
