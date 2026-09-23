<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->string('owner_type', 20)->default('agency')->after('user_id');
            $table->string('department')->default('')->after('owner_type');
            $table->string('contract_type', 40)->default('permanent')->after('department');
            $table->json('payload')->nullable()->after('mobility');
            $table->unsignedInteger('version')->default(1)->after('payload');
            $table->json('change_history')->nullable()->after('version');
        });
    }

    public function down(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropColumn([
                'owner_type', 'department', 'contract_type', 'payload', 'version', 'change_history',
            ]);
        });
    }
};
