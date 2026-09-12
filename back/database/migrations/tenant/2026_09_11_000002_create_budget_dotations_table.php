<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_dotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('annee_scolaire_id')->constrained('annees_scolaires')->restrictOnDelete();
            $table->foreignId('demandeur_id')->constrained('users')->restrictOnDelete();
            $table->string('reference')->unique();
            $table->decimal('montant_demande', 12, 2);
            $table->text('motif');
            $table->decimal('montant_octroye', 12, 2)->nullable();
            // brouillon | soumise | approuvee | rejetee
            $table->string('statut', 20)->default('brouillon');
            // La DG (group_admins, hors base tenant) ou un rôle local (users) selon le cas —
            // pas de contrainte FK possible sur validee_par_id, cf. Notification.owner_type.
            $table->string('validee_par_type', 20)->nullable();
            $table->unsignedBigInteger('validee_par_id')->nullable();
            $table->string('validee_par_nom')->nullable();
            $table->timestamp('validee_le')->nullable();
            $table->text('commentaire_validation')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_dotations');
    }
};
