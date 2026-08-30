<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Pas de $connection forcée : cette migration tourne sur la connexion par
    // défaut (mysql en prod/dev, sqlite en tests — comme groups/tenants), ce
    // qui la garde utilisable en tests via RefreshDatabase. Les modèles
    // Module/TenantModule/GroupModule, eux, forcent 'mysql' (base centrale) ;
    // en tests, cette connexion est aliasée vers la même base sqlite quand
    // nécessaire (cf. tests\Feature\ImportEnseignantTest::setUp()).
    public function up(): void
    {
        // Catalogue des modules/sous-modules activables (calqué sur les groupes/items du menu école)
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('label');
            $table->foreignId('parent_id')->nullable()->constrained('modules')->cascadeOnDelete();
            $table->unsignedInteger('ordre')->default(0);
            $table->boolean('actif_par_defaut')->default(true);
            $table->timestamps();
        });

        // Overrides par établissement (priorité la plus haute)
        Schema::create('tenant_modules', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'module_id']);
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        // Overrides par groupe d'établissements (hérités par les tenants du groupe sans override propre)
        Schema::create('group_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['group_id', 'module_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_modules');
        Schema::dropIfExists('tenant_modules');
        Schema::dropIfExists('modules');
    }
};
