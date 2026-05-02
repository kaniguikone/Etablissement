<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chapitres_matiere', function (Blueprint $table) {
            $table->foreignId('serie_id')->nullable()->after('niveau_id')
                ->constrained('series')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('chapitres_matiere', function (Blueprint $table) {
            $table->dropForeign(['serie_id']);
            $table->dropColumn('serie_id');
        });
    }
};
