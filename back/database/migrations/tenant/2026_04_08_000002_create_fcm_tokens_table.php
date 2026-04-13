<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fcm_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('owner_type', 20); // 'parent' | 'user' | 'enseignant'
            $table->unsignedBigInteger('owner_id');
            $table->text('token');
            $table->timestamps();

            $table->unique(['owner_type', 'owner_id']); // un seul token FCM par utilisateur
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fcm_tokens');
    }
};
