<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('professional_profiles', function (Blueprint $table) {
            $table->boolean('is_published')->default(true)->after('certifications');
            $table->boolean('is_verified')->default(false)->after('is_published');
            $table->boolean('is_online')->default(false)->after('is_verified');
            $table->decimal('rating_avg', 3, 2)->default(0)->after('is_online');
            $table->unsignedInteger('review_count')->default(0)->after('rating_avg');
            $table->string('comune', 120)->default('')->after('review_count');
            $table->string('cap', 10)->default('')->after('comune');
            $table->string('regione', 120)->default('')->after('cap');
            $table->string('istat', 20)->default('')->after('regione');
            $table->index(['is_published', 'comune']);
            $table->index(['is_published', 'regione']);
        });
    }

    public function down(): void
    {
        Schema::table('professional_profiles', function (Blueprint $table) {
            $table->dropIndex(['is_published', 'comune']);
            $table->dropIndex(['is_published', 'regione']);
            $table->dropColumn([
                'is_published', 'is_verified', 'is_online', 'rating_avg', 'review_count',
                'comune', 'cap', 'regione', 'istat',
            ]);
        });
    }
};
