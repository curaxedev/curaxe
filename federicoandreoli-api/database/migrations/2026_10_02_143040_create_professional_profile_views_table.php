<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_profile_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_profile_id')->constrained('professional_profiles')->cascadeOnDelete();
            $table->foreignId('viewer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('viewer_key', 80);
            $table->date('viewed_on');
            $table->timestamps();

            $table->unique(
                ['professional_profile_id', 'viewer_key', 'viewed_on'],
                'prof_profile_views_unique_day'
            );
            $table->index(['professional_profile_id', 'viewed_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professional_profile_views');
    }
};
