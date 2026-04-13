<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->decimal('note', 5, 2);

            $table->unsignedBigInteger('eleve_id');
            $table->foreign('eleve_id')
                ->references('id')
                ->on('eleves')
                ->onDelete('cascade')
                ->onUpdate('cascade');

            $table->unsignedBigInteger('devoir_id');
            $table->foreign('devoir_id')
                ->references('id')
                ->on('devoirs')
                ->onDelete('cascade')
                ->onUpdate('cascade');

            $table->unique(['eleve_id', 'devoir_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
