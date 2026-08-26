<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Types de frais annexes (configuration)
        Schema::create('frais_annexes', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 150);
            $table->string('categorie', 30)->default('autre');
            // categorie: tenue | manuel | apes | examen | transport | cantine | activite | autre
            $table->decimal('montant', 12, 2);
            $table->string('annee', 12);                   // ex. "2025-2026"
            $table->unsignedBigInteger('niveau_id')->nullable(); // null = tous les niveaux
            $table->boolean('obligatoire')->default(true);
            $table->string('description', 255)->nullable();
            $table->timestamps();

            $table->foreign('niveau_id')->references('id')->on('niveaux')->nullOnDelete();
        });

        // Paiements effectués par élève
        Schema::create('paiements_frais_annexes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('eleve_id');
            $table->unsignedBigInteger('frais_annexe_id');
            $table->decimal('montant_paye', 12, 2);
            $table->date('date_paiement');
            $table->string('mode_paiement', 20)->default('especes');
            // mode: especes | cheque | virement | autre
            $table->string('reference_paiement', 100)->nullable();
            $table->string('remarque', 255)->nullable();
            // Paiement en ligne CinetPay ajouté dans 2026_08_26_000002 (migration
            // supprimée après application aux tenants existants)
            $table->string('transaction_id')->nullable()->unique();
            $table->string('statut_cinetpay')->nullable();
            $table->string('payment_url', 500)->nullable();
            $table->timestamps();

            $table->foreign('eleve_id')->references('id')->on('eleves')->cascadeOnDelete();
            $table->foreign('frais_annexe_id')->references('id')->on('frais_annexes')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paiements_frais_annexes');
        Schema::dropIfExists('frais_annexes');
    }
};
