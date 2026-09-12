<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_depenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('annee_scolaire_id')->constrained('annees_scolaires')->restrictOnDelete();
            $table->foreignId('periode_id')->nullable()->constrained('periodes')->nullOnDelete();
            $table->foreignId('categorie_id')->constrained('budget_categories_depense')->restrictOnDelete();
            $table->string('libelle');
            $table->decimal('montant', 12, 2);
            $table->date('date_depense');
            $table->string('beneficiaire')->nullable();
            // especes | cheque | virement | mobile_money | autre
            $table->string('mode_paiement', 20);
            $table->string('justificatif_path')->nullable();
            $table->foreignId('saisie_par_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_depenses');
    }
};
