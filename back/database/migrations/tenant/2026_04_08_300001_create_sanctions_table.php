<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sanctions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('eleve_id')->constrained('eleves')->cascadeOnDelete();
            // avertissement | blame | exclusion_temp | exclusion_def | convocation | autre
            $table->string('type', 30)->default('avertissement');
            $table->string('motif', 300);
            $table->text('description')->nullable();
            $table->date('date_sanction');
            // Pour les exclusions temporaires
            $table->date('date_fin')->nullable();
            // Qui a prononcé la sanction
            $table->string('prononcee_par', 150)->nullable();
            // true = notifié / false = pas encore
            $table->boolean('parent_notifie')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sanctions');
    }
};
