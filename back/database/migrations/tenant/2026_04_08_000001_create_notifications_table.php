<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            // owner : 'parent' | 'user' | 'enseignant'
            $table->string('owner_type', 20);
            $table->unsignedBigInteger('owner_id');
            // type métier
            $table->string('type', 50); // absence | bulletin | paiement_retard | information | devoir | inscription
            $table->string('titre', 255);
            $table->text('corps');
            $table->json('data')->nullable(); // données contextuelles (eleve_id, devoir_id, …)
            $table->timestamp('lu_le')->nullable(); // null = non lu
            $table->timestamps();

            $table->index(['owner_type', 'owner_id', 'lu_le']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
