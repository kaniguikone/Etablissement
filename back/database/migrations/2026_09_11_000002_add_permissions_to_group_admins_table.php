<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_admins', function (Blueprint $table) {
            $table->boolean('super')->default(false)->after('group_id');
            $table->json('permissions')->nullable()->after('super');
        });

        // Avant ce chantier, un GroupAdmin authentifié avait de fait un accès total
        // (aucune notion de restriction n'existait). On préserve ce comportement pour
        // les comptes déjà créés ; tout nouveau GroupAdmin démarrera à super=false et
        // devra être explicitement configuré.
        DB::table('group_admins')->update(['super' => true]);
    }

    public function down(): void
    {
        Schema::table('group_admins', function (Blueprint $table) {
            $table->dropColumn(['super', 'permissions']);
        });
    }
};
