<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations_rdv', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creneau_id')->constrained('creneaux_rdv')->cascadeOnDelete();
            $table->foreignId('parent_id')->constrained('parents')->cascadeOnDelete();
            $table->foreignId('eleve_id')->constrained('eleves')->cascadeOnDelete();
            $table->enum('statut', ['en_attente', 'confirme', 'annule'])->default('en_attente');
            $table->text('motif')->nullable();
            $table->text('note_enseignant')->nullable();
            $table->timestamps();

            $table->unique('creneau_id'); // un créneau = une seule réservation
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations_rdv');
    }
};
