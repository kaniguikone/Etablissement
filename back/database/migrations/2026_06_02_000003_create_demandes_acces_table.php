<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Table centrale (pas tenant)
    protected $connection = 'mysql';

    public function up(): void
    {
        Schema::connection('mysql')->create('demandes_acces', function (Blueprint $table) {
            $table->id();
            $table->string('nom_etablissement');
            $table->string('type');                        // lycee | lycee_complet | college | primaire
            $table->string('code_ministere');              // code officiel MENET
            $table->string('ville')->nullable();
            $table->string('telephone')->nullable();
            $table->string('nom_responsable');
            $table->string('email');
            $table->string('statut')->default('en_attente'); // en_attente | acceptee | refusee
            $table->text('notes')->nullable();             // notes internes opérateur
            $table->string('tenant_id')->nullable();          // rempli après acceptation
            $table->string('mot_de_passe_initial')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('demandes_acces');
    }
};
