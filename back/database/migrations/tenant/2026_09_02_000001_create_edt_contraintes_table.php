<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalogue des contraintes de confection d'emploi du temps (chantier EDT —
 * Lot 1). Traduction de la note MENET-FP/DPFC/DEEP : contraintes « dures »
 * (jamais violées) et « souples » (pénalisées, pondérées). Chaque établissement
 * peut activer/désactiver et pondérer les souples.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('edt_contraintes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('libelle');
            $table->enum('nature', ['dure', 'souple']);
            $table->boolean('active')->default(true);
            $table->unsignedSmallInteger('poids')->default(1); // pénalité si souple violée
            $table->json('parametres')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('edt_contraintes');
    }
};
