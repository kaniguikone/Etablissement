<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Mode de paiement portail parent, configuré une fois par l'école
        Schema::table('etablissement', function (Blueprint $table) {
            $table->enum('parent_payment_mode', ['parent_self_pay', 'school_collects'])
                  ->default('school_collects')
                  ->after('site_web');
        });

        // Relation many-to-many élève <-> parent (max 2 par élève, contrôle applicatif)
        Schema::create('eleve_parent', function (Blueprint $table) {
            $table->id();
            $table->foreignId('eleve_id')->constrained('eleves')->cascadeOnDelete();
            $table->foreignId('parent_id')->constrained('parents')->cascadeOnDelete();
            $table->enum('relation', ['Père', 'Mère', 'Tuteur', 'Autre'])->nullable();
            $table->timestamps();

            $table->unique(['eleve_id', 'parent_id']);
        });

        // Abonnement portail parent — lié à l'élève, partagé entre les 2 parents
        Schema::create('parent_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('eleve_id')->constrained('eleves')->cascadeOnDelete();
            $table->enum('statut', ['en_attente', 'actif', 'expire', 'annule'])->default('en_attente');
            $table->enum('payment_mode', ['parent_self_pay', 'school_collects']);
            $table->decimal('montant', 10, 2)->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('parents')->nullOnDelete();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('reference_paiement', 100)->nullable();
            $table->string('transaction_id', 100)->nullable();
            $table->timestamps();
        });

        // Slots parents achetés par l'école (mode school_collects)
        Schema::create('school_parent_slots', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('slots_achetes')->default(0);
            $table->unsignedInteger('slots_utilises')->default(0);
            $table->decimal('montant_total', 10, 2)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_parent_slots');
        Schema::dropIfExists('parent_subscriptions');
        Schema::dropIfExists('eleve_parent');
        Schema::table('etablissement', function (Blueprint $table) {
            $table->dropColumn('parent_payment_mode');
        });
    }
};
