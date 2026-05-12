<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devoirs', function (Blueprint $table) {
            $table->id();
            $table->string('code_devoir');
            $table->date('date_devoir');
            $table->decimal('coeff_devoir', 5, 2)->default(1);

            $table->foreignId('type_devoir_id')
                  ->constrained('type_devoirs')
                  ->onDelete('restrict')
                  ->onUpdate('restrict');

            $table->foreignId('matiere_id')
                  ->constrained('matieres')
                  ->onDelete('restrict')
                  ->onUpdate('restrict');

            $table->foreignId('classe_id')
                  ->nullable()
                  ->constrained('classes')
                  ->onDelete('restrict')
                  ->onUpdate('restrict');

            $table->foreignId('niveau_id')
                  ->nullable()
                  ->constrained('niveaux')
                  ->onDelete('restrict');

            $table->foreignId('periode_id')
                  ->nullable()
                  ->constrained('periodes')
                  ->onDelete('restrict')
                  ->onUpdate('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devoirs');
    }
};
