<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('nom')->unique();           // identifiant technique (slug)
            $table->string('label');                    // nom affiché
            $table->json('permissions')->nullable();    // tableau des clés de permission
            $table->boolean('super')->default(false);  // contourne tous les contrôles
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
