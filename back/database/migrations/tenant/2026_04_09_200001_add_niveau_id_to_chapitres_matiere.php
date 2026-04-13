<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chapitres_matiere', function (Blueprint $table) {
            $table->foreignId('niveau_id')->nullable()->after('matiere_id')
                  ->constrained('niveaux')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('chapitres_matiere', function (Blueprint $table) {
            $table->dropForeign(['niveau_id']);
            $table->dropColumn('niveau_id');
        });
    }
};
