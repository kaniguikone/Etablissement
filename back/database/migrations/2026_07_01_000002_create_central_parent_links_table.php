<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('central_parent_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('central_user_id')
                  ->constrained('central_users')
                  ->cascadeOnDelete();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->string('matricule_eleve', 50);
            $table->enum('statut', ['en_attente', 'actif', 'expire', 'annule'])->default('en_attente');
            $table->enum('payment_mode', ['parent_self_pay', 'school_collects'])->default('parent_self_pay');
            $table->decimal('montant', 10, 2)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['central_user_id', 'tenant_id', 'matricule_eleve'], 'cpl_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('central_parent_links');
    }
};
