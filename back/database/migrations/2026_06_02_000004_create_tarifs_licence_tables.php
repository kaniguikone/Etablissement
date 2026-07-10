<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    public function up(): void
    {
        // La base centrale MySQL n'est pas disponible en tests (SQLite in-memory)
        if (app()->environment('testing')) return;

        // Tranches de prix par élève
        Schema::connection('mysql')->create('tarifs_licence', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('tranche_min');           // borne basse (incluse)
            $table->unsignedInteger('tranche_max')->nullable(); // borne haute (incluse) — null = illimité
            $table->unsignedInteger('prix_par_eleve');         // FCFA/élève/an
            $table->unsignedInteger('ordre')->default(0);      // ordre d'affichage
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });

        // Paramètres globaux de la licence
        Schema::connection('mysql')->create('config_saas', function (Blueprint $table) {
            $table->id();
            $table->string('cle')->unique();
            $table->string('valeur');
            $table->string('libelle');                         // label lisible pour l'admin
            $table->timestamps();
        });
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        Schema::connection('mysql')->dropIfExists('tarifs_licence');
        Schema::connection('mysql')->dropIfExists('config_saas');
    }
};
