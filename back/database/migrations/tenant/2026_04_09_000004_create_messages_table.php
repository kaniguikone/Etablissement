<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->string('expediteur_type', 20); // 'parent' | 'enseignant'
            $table->unsignedBigInteger('expediteur_id');
            $table->string('destinataire_type', 20); // 'parent' | 'enseignant'
            $table->unsignedBigInteger('destinataire_id');
            $table->foreignId('eleve_id')->nullable()->constrained('eleves')->nullOnDelete();
            $table->text('contenu');
            $table->timestamp('lu_at')->nullable();
            $table->timestamps();

            $table->index(['expediteur_type', 'expediteur_id']);
            $table->index(['destinataire_type', 'destinataire_id']);
            $table->index('eleve_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
