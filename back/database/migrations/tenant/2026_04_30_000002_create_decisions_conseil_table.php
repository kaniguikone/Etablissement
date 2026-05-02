<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('decisions_conseil', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('eleve_id');
            $table->unsignedBigInteger('classe_id');
            $table->unsignedBigInteger('periode_id');
            $table->enum('decision', [
                'admis_felicitations',
                'admis_encouragements',
                'admis',
                'passage_conditionnel',
                'avertissement',
                'blame',
                'redoublement',
                'exclu',
            ])->nullable();
            $table->text('appreciation_generale')->nullable();
            $table->timestamps();

            $table->unique(['eleve_id', 'periode_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decisions_conseil');
    }
};
