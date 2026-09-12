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
            // Qui, précisément, la DG a désigné pour approuver à sa place dans cet
            // établissement. Pas de contrainte FK (users est dans la base du tenant,
            // pas dans la base centrale) — id + nom en snapshot, comme
            // budget_dotations.validee_par_id/nom.
            $table->unsignedBigInteger('budget_delegue_user_id')->nullable()->after('budget_delegation_active');
            $table->string('budget_delegue_nom')->nullable()->after('budget_delegue_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['budget_delegue_user_id', 'budget_delegue_nom']);
        });
    }
};
