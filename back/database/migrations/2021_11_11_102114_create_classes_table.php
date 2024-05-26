<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateClassesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('num_classe');
            $table->string('nom_classe');
            $table->string('abbr_classe');
            
            $table->unsignedBigInteger('niveau_id');
            $table->foreign('niveau_id')
            ->references('id')
            ->on('niveaux')
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
        Schema::dropIfExists('classes');
    }
}
