<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_settings', function (Blueprint $table) {
            $table->id();
            $table->string('mode', 16)->default('test'); // test|live
            $table->text('secret_key_encrypted')->nullable();
            $table->string('publishable_key')->nullable();
            $table->text('webhook_secret_encrypted')->nullable();
            $table->string('secret_key_hint', 32)->nullable();
            $table->string('webhook_secret_hint', 32)->nullable();
            $table->string('price_professional')->nullable();
            $table->string('price_agency')->nullable();
            $table->string('price_structure')->nullable();
            $table->unsignedSmallInteger('trial_days_professional')->default(14);
            $table->unsignedSmallInteger('trial_days_agency')->default(14);
            $table->unsignedSmallInteger('trial_days_structure')->default(14);
            $table->string('portal_configuration_id')->nullable();
            $table->string('webhook_endpoint_id')->nullable();
            $table->json('last_diagnostic')->nullable();
            $table->timestamp('setup_completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stripe_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id')->unique();
            $table->string('type', 80);
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('billing_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('stripe_refund_id')->nullable()->unique();
            $table->unsignedInteger('amount_cents')->default(0);
            $table->string('currency', 8)->default('eur');
            $table->string('status', 32)->default('pending');
            $table->string('reason', 120)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('webauthn_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('credential_id', 512)->unique();
            $table->string('credential_id_hash', 64)->unique();
            $table->text('public_key');
            $table->longText('credential_record');
            $table->unsignedBigInteger('sign_count')->default(0);
            $table->string('name', 120)->default('Passkey');
            $table->json('transports')->nullable();
            $table->string('aaguid', 64)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->index('user_id');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('trial_ends_at')->nullable()->after('current_period_end');
            $table->timestamp('current_period_start')->nullable()->after('current_period_end');
            $table->timestamp('cancel_at')->nullable()->after('cancel_at_period_end');
            $table->string('price_id')->nullable()->after('stripe_subscription_id');
            $table->string('latest_invoice_id')->nullable()->after('price_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'trial_ends_at',
                'current_period_start',
                'cancel_at',
                'price_id',
                'latest_invoice_id',
            ]);
        });
        Schema::dropIfExists('webauthn_credentials');
        Schema::dropIfExists('billing_refunds');
        Schema::dropIfExists('stripe_webhook_events');
        Schema::dropIfExists('billing_settings');
    }
};
