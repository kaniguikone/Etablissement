<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('etablissement', function (Blueprint $table) {
            $table->string('type')->nullable()->after('nom');           // lycee | lycee_complet | college | primaire
            $table->string('code_ministere')->nullable()->after('type'); // code officiel MENET
        });
    }

    public function down(): void
    {
        Schema::table('etablissement', function (Blueprint $table) {
            $table->dropColumn(['type', 'code_ministere']);
        });
    }
};
