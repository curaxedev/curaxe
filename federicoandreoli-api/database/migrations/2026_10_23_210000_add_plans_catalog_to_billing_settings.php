<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billing_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('billing_settings', 'plans_catalog')) {
                $table->json('plans_catalog')->nullable()->after('trial_days_structure');
            }
        });
    }

    public function down(): void
    {
        Schema::table('billing_settings', function (Blueprint $table) {
            if (Schema::hasColumn('billing_settings', 'plans_catalog')) {
                $table->dropColumn('plans_catalog');
            }
        });
    }
};
