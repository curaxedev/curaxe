<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriptions', 'trashed_at')) {
                $table->timestamp('trashed_at')->nullable()->after('history');
                $table->index('trashed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            if (Schema::hasColumn('subscriptions', 'trashed_at')) {
                $table->dropIndex(['trashed_at']);
                $table->dropColumn('trashed_at');
            }
        });
    }
};
