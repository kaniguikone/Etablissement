<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('demandes_acces', function (Blueprint $table) {
            $table->string('mot_de_passe_initial')->nullable()->after('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('demandes_acces', function (Blueprint $table) {
            $table->dropColumn('mot_de_passe_initial');
        });
    }
};
