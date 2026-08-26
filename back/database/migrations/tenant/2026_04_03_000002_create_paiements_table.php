<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paiements', function (Blueprint $table) {
            $table->id();
            // FK vers 'annees_scolaires' ajoutée dans 2026_07_13_000001 (table créée bien plus tard chronologiquement)
            $table->foreignId('annee_scolaire_id')->nullable();
            $table->foreignId('eleve_id')->constrained('eleves')->onDelete('cascade');
            $table->foreignId('scolarite_id')->constrained('scolarites')->onDelete('cascade');
            $table->decimal('montant_paye', 10, 2);
            $table->date('date_paiement');
            // 'cinetpay' ajouté dans 2026_08_26_000001 (migration supprimée après application aux tenants existants)
            $table->enum('mode_paiement', ['especes', 'cheque', 'virement', 'cinetpay', 'autre'])->default('especes');
            $table->string('reference_paiement')->nullable();
            $table->string('remarque')->nullable();
            $table->string('transaction_id')->nullable()->unique();
            $table->string('statut_cinetpay')->nullable();
            $table->string('payment_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paiements');
    }
};
