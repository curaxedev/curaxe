<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('target_type', 32); // job_posting | family_request
            $table->unsignedBigInteger('target_id');
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('applicant_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 32)->default('submitted');
            $table->text('message')->nullable();
            $table->string('applicant_name')->default('');
            $table->string('applicant_initials', 8)->default('');
            $table->string('applicant_category')->default('');
            $table->string('applicant_zone')->default('');
            $table->decimal('applicant_stars', 3, 2)->default(0);
            $table->string('applicant_preview', 500)->default('');
            $table->string('target_title')->default('');
            $table->string('target_publisher_name')->default('');
            $table->string('target_publisher_kind', 20)->default('famiglia');
            $table->timestamps();

            $table->unique(['target_type', 'target_id', 'applicant_id']);
            $table->index(['owner_id', 'status']);
            $table->index(['applicant_id', 'status']);
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
