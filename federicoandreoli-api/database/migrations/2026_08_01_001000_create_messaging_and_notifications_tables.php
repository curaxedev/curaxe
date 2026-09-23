<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_threads', function (Blueprint $table) {
            $table->id();
            $table->json('participant_ids');
            $table->json('participant_names');
            $table->json('participant_roles');
            $table->string('subject');
            $table->string('link_type', 40)->default('direct_contact');
            $table->string('link_id')->nullable();
            $table->string('link_label')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->string('last_message_preview', 500)->default('');
            $table->json('unread_by_user_id');
            $table->timestamps();
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('message_threads')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('sender_name');
            $table->text('body');
            $table->timestamps();
            $table->index(['thread_id', 'id']);
        });

        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('audience', 32);
            $table->string('text', 500);
            $table->string('type', 20)->default('info');
            $table->boolean('read')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'read']);
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('audience', 32);
            $table->string('plan_type', 40)->default('free');
            $table->string('status', 32)->default('inactive');
            $table->string('stripe_customer_id')->nullable();
            $table->string('stripe_subscription_id')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->json('history')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('app_notifications');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('message_threads');
    }
};
