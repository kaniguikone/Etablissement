<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('remplacements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creneau_id')->constrained('emploi_du_temps')->cascadeOnDelete();
            $table->date('date_remplacement');
            $table->foreignId('enseignant_absent_id')->constrained('enseignants')->cascadeOnDelete();
            $table->foreignId('remplacant_id')->nullable()->constrained('enseignants')->nullOnDelete();
            $table->enum('statut', ['a_couvrir', 'couvert', 'non_couvert'])->default('a_couvrir');
            $table->string('motif_absence', 200)->nullable();
            $table->text('note')->nullable();
            $table->boolean('notifie_enseignant')->default(false);
            $table->timestamps();

            $table->unique(['creneau_id', 'date_remplacement']);
            $table->index('date_remplacement');
            $table->index('enseignant_absent_id');
            $table->index('remplacant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('remplacements');
    }
};
