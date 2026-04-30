<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('etablissement', function (Blueprint $table) {
            $table->unsignedInteger('mobile_version_code')->default(1)->after('pays');
            $table->string('mobile_version_name', 20)->default('1.0.0')->after('mobile_version_code');
            $table->string('mobile_download_url', 500)->nullable()->after('mobile_version_name');
            $table->boolean('mobile_force_update')->default(false)->after('mobile_download_url');
        });
    }

    public function down(): void
    {
        Schema::table('etablissement', function (Blueprint $table) {
            $table->dropColumn([
                'mobile_version_code',
                'mobile_version_name',
                'mobile_download_url',
                'mobile_force_update',
            ]);
        });
    }
};
