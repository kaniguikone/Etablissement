<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class EnseignantMatiere extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('enseignant_matiere', function (Blueprint $table) {
            $table->id();
            
            $table->unsignedBigInteger('enseignant_id');
            $table->foreign('enseignant_id')
            ->references('id')
            ->on('enseignants')
            ->onDelete('cascade')
            ->onUpdate('cascade');
            $table->unsignedBigInteger('matiere_id');
            $table->foreign('matiere_id')
            ->references('id')
            ->on('matieres')
            ->onDelete('cascade')
            ->onUpdate('cascade');

            $table->timestamps();
            });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}
