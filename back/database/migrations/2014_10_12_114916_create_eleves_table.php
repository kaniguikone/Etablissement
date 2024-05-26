<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateElevesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('eleves', function (Blueprint $table) {
            $table->id();
            $table->string('matricule_eleve');
            $table->string('nom_eleve');
            $table->string('prenoms_eleve');
            $table->date('date_naissance_eleve');
                      
            $table->unsignedBigInteger('classe_id');
            $table->foreign('classe_id')
            ->references('id')
            ->on('classes')
            ->onDelete('restrict')
            ->onUpdate('restrict');
            
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
        Schema::dropIfExists('eleves');
    }
}
