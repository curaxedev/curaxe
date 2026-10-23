<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('platform_settings')) {
            Schema::create('platform_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key', 64)->unique();
                $table->json('value');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('support_tickets')) {
            Schema::create('support_tickets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('user_name', 160)->default('');
                $table->string('category', 80)->default('generale');
                $table->string('priority', 20)->default('normal');
                $table->string('status', 20)->default('open');
                $table->string('assigned_to', 160)->nullable();
                $table->timestamps();
                $table->index(['status', 'priority']);
            });
        }

        if (! Schema::hasTable('support_ticket_messages')) {
            Schema::create('support_ticket_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('support_ticket_id')->constrained('support_tickets')->cascadeOnDelete();
                $table->string('author', 20)->default('user');
                $table->string('author_name', 160)->default('');
                $table->text('body');
                $table->timestamps();
            });
        }

        if (Schema::hasTable('professional_documents') && ! Schema::hasColumn('professional_documents', 'review_status')) {
            Schema::table('professional_documents', function (Blueprint $table) {
                $table->string('review_status', 20)->default('pending')->after('size_bytes');
                $table->text('reject_reason')->nullable()->after('review_status');
            });
        }

        // Seed default platform settings once.
        $exists = DB::table('platform_settings')->where('key', 'platform')->exists();
        if (! $exists) {
            DB::table('platform_settings')->insert([
                'key' => 'platform',
                'value' => json_encode([
                    'pricing' => [
                        'premiumMonthlyEur' => 19.9,
                        'premiumYearlyEur' => 179,
                    ],
                    'emailNotifications' => [
                        'newRegistration' => true,
                        'newRequest' => true,
                        'paymentReceived' => true,
                        'paymentFailed' => true,
                        'profileVerified' => true,
                    ],
                    'emailTemplates' => [
                        'welcomeSubject' => 'Benvenuto su Curaxe',
                        'paymentFailedSubject' => 'Pagamento non riuscito — azione richiesta',
                    ],
                    'maintenance' => [
                        'enabled' => false,
                        'message' => 'Stiamo effettuando manutenzione. Torneremo presto.',
                    ],
                    'commissionRates' => [
                        'professionalPercent' => 8,
                        'agencyPercent' => 12,
                    ],
                    'featureFlags' => [
                        'b2bJobPostings' => true,
                        'familyMessaging' => true,
                        'stripeCheckout' => true,
                        'maintenanceBanner' => false,
                    ],
                    'freeLimits' => [
                        'maxRequestsPerMonth' => 3,
                        'maxActiveApplications' => 5,
                    ],
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('professional_documents') && Schema::hasColumn('professional_documents', 'review_status')) {
            Schema::table('professional_documents', function (Blueprint $table) {
                $table->dropColumn(['review_status', 'reject_reason']);
            });
        }
        Schema::dropIfExists('support_ticket_messages');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('platform_settings');
    }
};
