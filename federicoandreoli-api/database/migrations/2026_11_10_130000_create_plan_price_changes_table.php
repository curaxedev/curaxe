<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_price_changes', function (Blueprint $table) {
            $table->id();
            $table->string('plan_key', 80)->index();
            $table->string('plan_label', 120)->nullable();
            $table->string('old_price_id', 120)->nullable()->index();
            $table->string('new_price_id', 120)->nullable()->index();
            $table->unsignedInteger('old_amount_cents')->nullable();
            $table->unsignedInteger('new_amount_cents')->nullable();
            $table->string('old_interval', 16)->nullable();
            $table->string('new_interval', 16)->nullable();
            /** grandfather_indefinite|grandfather_months|cancel_at_period_end|cancel_immediately */
            $table->string('policy', 40);
            $table->unsignedTinyInteger('grandfather_months')->nullable();
            $table->timestamp('grace_ends_at')->nullable()->index();
            $table->unsignedInteger('affected_subscriptions')->default(0);
            /** pending|applied|grace_active|completed|failed */
            $table->string('status', 24)->default('applied')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_price_changes');
    }
};
