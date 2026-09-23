<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('status', 20)->default('active');
            $table->string('assistance_type', 40);
            $table->string('beneficiary', 40);
            $table->string('employment_type', 40);
            $table->string('comune', 120);
            $table->unsignedInteger('budget_monthly')->nullable();
            $table->json('days');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_requests');
    }
};
