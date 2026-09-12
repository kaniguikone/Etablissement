<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // La DG du groupe délègue explicitement l'approbation budgétaire de CET
            // établissement à un rôle local — sans effet si l'établissement n'a pas
            // de groupe (group_id nul), auquel cas l'approbation est locale d'office.
            $table->boolean('budget_delegation_active')->default(false)->after('group_id');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('budget_delegation_active');
        });
    }
};
