<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_security_settings', function (Blueprint $table) {
            $table->boolean('password_login_enabled')->default(true)->after('login_alert_emails');
            $table->timestamp('recovery_codes_generated_at')->nullable()->after('password_login_enabled');
        });

        Schema::create('admin_recovery_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code_hash', 255);
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'used_at']);
        });

        Schema::create('admin_recovery_email_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 255);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_recovery_email_tokens');
        Schema::dropIfExists('admin_recovery_codes');

        Schema::table('admin_security_settings', function (Blueprint $table) {
            $table->dropColumn(['password_login_enabled', 'recovery_codes_generated_at']);
        });
    }
};
