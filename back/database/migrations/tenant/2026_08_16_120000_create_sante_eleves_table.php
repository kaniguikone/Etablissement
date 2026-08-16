<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sante_eleves', function (Blueprint $table) {
            $table->id();

            $table->foreignId('eleve_id')
                  ->unique()
                  ->constrained('eleves')
                  ->onDelete('cascade');

            $table->string('groupe_sanguin', 10)->nullable();
            $table->text('allergies')->nullable();
            $table->string('medecin_nom')->nullable();
            $table->string('medecin_telephone', 30)->nullable();

            $table->string('contact_urgence_nom')->nullable();
            $table->string('contact_urgence_lien', 50)->nullable();
            $table->string('contact_urgence_telephone', 30)->nullable();

            $table->string('assurance_compagnie')->nullable();
            $table->string('assurance_numero_police', 100)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sante_eleves');
    }
};
