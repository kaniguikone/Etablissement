<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('central_enseignant_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('central_user_id')
                  ->constrained('central_users')
                  ->cascadeOnDelete();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unsignedBigInteger('local_enseignant_id');
            $table->enum('statut', ['actif', 'inactif'])->default('actif');
            $table->timestamps();

            $table->unique(['central_user_id', 'tenant_id'], 'cel_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('central_enseignant_links');
    }
};
