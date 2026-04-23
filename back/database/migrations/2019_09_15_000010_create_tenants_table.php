<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTenantsTable extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->string('id')->primary();             // slug unique ex: lycee-moderne
            $table->string('code', 8)->unique()->nullable(); // code court partageable ex: LYC001

            // Informations de l'établissement
            $table->string('nom');                       // Nom complet
            $table->string('email_contact')->nullable();
            $table->string('telephone')->nullable();
            $table->string('ville')->nullable();
            $table->string('pays')->nullable();
            $table->enum('plan', ['demo', 'basic', 'pro'])->default('demo');
            $table->boolean('actif')->default(true);
            $table->date('date_expiration')->nullable();  // null = pas d'expiration

            $table->timestamps();
            $table->json('data')->nullable();             // Colonnes custom stancl/tenancy
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
}
