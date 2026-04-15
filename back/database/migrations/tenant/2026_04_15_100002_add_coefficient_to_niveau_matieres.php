<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('niveau_matieres', function (Blueprint $table) {
            $table->decimal('coefficient', 4, 2)->default(1.00)->after('obligatoire');
        });
    }

    public function down(): void
    {
        Schema::table('niveau_matieres', function (Blueprint $table) {
            $table->dropColumn('coefficient');
        });
    }
};
