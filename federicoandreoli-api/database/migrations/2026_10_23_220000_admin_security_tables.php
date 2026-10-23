<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_security_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('security_total_enabled')->default(false);
            $table->timestamp('security_total_enabled_at')->nullable();
            $table->boolean('login_alerts_enabled')->default(false);
            $table->json('login_alert_emails')->nullable();
            $table->timestamps();
        });

        Schema::create('admin_login_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('device_hash', 64);
            $table->string('label', 120)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->string('last_ip', 45)->nullable();
            $table->boolean('trusted')->default(false);
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->unique(['user_id', 'device_hash']);
            $table->index(['user_id', 'last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_login_devices');
        Schema::dropIfExists('admin_security_settings');
    }
};
