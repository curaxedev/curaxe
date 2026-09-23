<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_postings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('active'); // active|paused|closed|draft|pending
            $table->string('category', 40)->default('caregiver');
            $table->string('poster_type', 20)->default('agenzia'); // famiglia|agenzia|struttura
            $table->string('poster_display_name')->default('');
            $table->string('contract_bucket', 20)->default('other'); // hourly|ccnl|other
            $table->string('title');
            $table->string('excerpt', 500)->default('');
            $table->string('location_label')->default('');
            $table->string('comune', 120)->default('');
            $table->string('regione', 120)->default('');
            $table->string('rate_label')->default('');
            $table->string('schedule_label')->default('');
            $table->string('urgency', 20)->nullable();
            $table->string('badge')->nullable();
            $table->text('description_intro')->nullable();
            $table->json('duties');
            $table->json('requirements');
            $table->json('mobility')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'published_at']);
            $table->index(['status', 'comune']);
            $table->index(['status', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_postings');
    }
};
