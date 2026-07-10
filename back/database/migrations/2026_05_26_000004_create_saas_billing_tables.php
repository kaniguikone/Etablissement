<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Toujours sur la connexion centrale (base MySQL principale)
    protected $connection = 'mysql';

    public function up(): void
    {
        // La base centrale MySQL n'est pas disponible en tests (SQLite in-memory)
        if (app()->environment('testing')) return;

        // Historique des abonnements SaaS par établissement
        Schema::connection('mysql')->create('abonnements_saas', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');           // FK → tenants.id
            $table->string('periode', 20);         // mensuel | annuel | offert | personnalise
            $table->date('date_debut');
            $table->date('date_fin');
            $table->decimal('montant_ht', 12, 2)->default(0);
            $table->decimal('taux_tva', 5, 2)->default(18.00); // TVA CIV = 18 %
            $table->decimal('montant_ttc', 12, 2)->default(0);
            $table->string('mode_paiement', 20)->default('virement');
            // mode: especes | cheque | virement | mobile_money | offert
            $table->string('reference_paiement', 100)->nullable();
            $table->string('statut', 20)->default('actif');
            // statut: actif | expire | annule | offert
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable(); // super_admins.id
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        // Factures émises pour les abonnements SaaS
        Schema::connection('mysql')->create('factures_saas', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 25)->unique(); // FAC-2026-000001
            $table->unsignedBigInteger('abonnement_id');
            $table->string('tenant_id');
            $table->decimal('montant_ht', 12, 2);
            $table->decimal('taux_tva', 5, 2)->default(18.00);
            $table->decimal('montant_tva', 12, 2);
            $table->decimal('montant_ttc', 12, 2);
            $table->date('date_emission');
            $table->date('date_echeance');
            $table->string('statut', 20)->default('emise'); // emise | payee | annulee
            $table->timestamps();

            $table->foreign('abonnement_id')->references('id')->on('abonnements_saas')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        Schema::connection('mysql')->dropIfExists('factures_saas');
        Schema::connection('mysql')->dropIfExists('abonnements_saas');
    }
};
