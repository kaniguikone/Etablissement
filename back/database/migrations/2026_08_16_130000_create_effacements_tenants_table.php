<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Table centrale (pas tenant) — trace des suppressions d'établissement,
    // conservée après coup puisque la base du tenant supprimé disparaît.
    protected $connection = 'mysql';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        Schema::connection('mysql')->create('effacements_tenants', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id_original');
            $table->string('nom_etablissement');
            $table->foreignId('super_admin_id')->nullable()->constrained('super_admins')->nullOnDelete();
            $table->text('motif')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        Schema::connection('mysql')->dropIfExists('effacements_tenants');
    }
};
