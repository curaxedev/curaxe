<?php

namespace Tests\Feature;

use App\Models\BillingSetting;
use App\Models\StripeWebhookEvent;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WebauthnCredential;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StripeBillingPasskeyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
    }

    public function test_mock_checkout_without_stripe_keys(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        $session = $this->postJson('/api/v1/billing/checkout-sessions', [
            'audience' => 'professional',
        ])
            ->assertCreated()
            ->assertJsonPath('mode', 'mock')
            ->json();

        $this->postJson('/api/v1/billing/checkout-sessions/'.$session['sessionId'].'/complete')
            ->assertOk()
            ->assertJsonPath('status', 'active');
    }

    public function test_family_user_cannot_checkout(): void
    {
        $family = User::query()->where('email', 'bianchi@email.it')->firstOrFail();
        Sanctum::actingAs($family);

        $this->postJson('/api/v1/billing/checkout-sessions', [
            'audience' => 'professional',
        ])->assertForbidden();
    }

    public function test_checkout_ignores_client_audience_mismatch(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        // Client chiede agency ma il ruolo è professional → audience forzata a professional.
        $this->postJson('/api/v1/billing/checkout-sessions', [
            'audience' => 'agency',
        ])
            ->assertCreated()
            ->assertJsonPath('audience', 'professional');
    }

    public function test_safe_return_url_rejects_open_redirects(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        config(['app.frontend_url' => 'https://curaxe.it']);
        config(['app.frontend_urls' => ['https://curaxe.it', 'https://www.curaxe.it']]);

        $service = app(\App\Services\Stripe\SubscriptionBillingService::class);
        $ref = new \ReflectionClass($service);
        $method = $ref->getMethod('safeReturnUrl');
        $method->setAccessible(true);

        $fallback = 'https://curaxe.it/dashboard?billing=success';
        $this->assertSame(
            $fallback,
            $method->invoke($service, 'https://curaxe.it@evil.com/phish', $fallback),
        );
        $this->assertSame(
            $fallback,
            $method->invoke($service, 'https://curaxe.it.evil.com/phish', $fallback),
        );
        $this->assertSame(
            'https://curaxe.it/dashboard/piano/esito?result=success',
            $method->invoke($service, 'https://curaxe.it/dashboard/piano/esito?result=success', $fallback),
        );
    }

    public function test_admin_billing_settings_roundtrip(): void
    {
        $admin = User::query()->where('role', 'platform_admin')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/billing/settings')
            ->assertOk()
            ->assertJsonPath('mode', 'test');

        $this->putJson('/api/v1/admin/billing/settings', [
            'mode' => 'test',
            'publishableKey' => 'pk_test_abc123456789',
            'secretKey' => 'sk_test_abc123456789xyz',
            'webhookSecret' => 'whsec_testsecretvalue123',
            'priceProfessional' => 'price_pro_1',
            'priceAgency' => 'price_ag_1',
            'priceStructure' => 'price_st_1',
            'trialDaysProfessional' => 7,
        ])
            ->assertOk()
            ->assertJsonPath('hasSecretKey', true)
            ->assertJsonPath('hasWebhookSecret', true)
            ->assertJsonPath('trialDaysProfessional', 7)
            ->assertJsonMissingPath('secretKey');

        $settings = BillingSetting::current();
        $this->assertNotNull($settings->decryptedSecretKey());
        $this->assertSame('sk_test_abc123456789xyz', $settings->decryptedSecretKey());
        $this->assertSame('whsec_testsecretvalue123', $settings->decryptedWebhookSecret());
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $settings = BillingSetting::current();
        $settings->setWebhookSecret('whsec_validsecretfortests');
        $settings->save();

        $this->postJson('/api/v1/webhooks/stripe', ['type' => 'ping'], [
            'Stripe-Signature' => 't=1,v1=bad',
        ])->assertStatus(400);
    }

    public function test_webhook_idempotency_store(): void
    {
        StripeWebhookEvent::query()->create([
            'event_id' => 'evt_test_duplicate',
            'type' => 'checkout.session.completed',
            'processed_at' => now(),
        ]);

        $this->assertSame(1, StripeWebhookEvent::query()->where('event_id', 'evt_test_duplicate')->count());
    }

    public function test_admin_passkey_list_empty(): void
    {
        $admin = User::query()->where('role', 'platform_admin')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/passkeys')
            ->assertOk()
            ->assertJsonPath('passkeys', []);
    }

    public function test_non_admin_cannot_manage_passkeys(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        $this->getJson('/api/v1/admin/passkeys')->assertForbidden();
    }

    public function test_passkey_login_options_anti_enumeration(): void
    {
        $this->postJson('/api/v1/auth/passkey/login/options', [
            'email' => 'nobody@example.com',
        ])
            ->assertOk()
            ->assertJsonStructure(['challengeId', 'options']);
    }

    public function test_subscription_payload_includes_trial_fields(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Subscription::query()->create([
            'user_id' => $pro->id,
            'audience' => 'professional',
            'plan_type' => 'professional_premium',
            'status' => 'trialing',
            'trial_ends_at' => now()->addDays(7),
            'history' => [],
        ]);

        Sanctum::actingAs($pro);
        $this->getJson('/api/v1/billing/subscription')
            ->assertOk()
            ->assertJsonPath('status', 'trialing')
            ->assertJsonStructure(['trialEndsAt']);
    }

    public function test_secrets_are_encrypted_at_rest(): void
    {
        $settings = BillingSetting::current();
        $settings->setSecretKey('sk_test_encrypt_me_please');
        $settings->save();

        $raw = $settings->fresh()->secret_key_encrypted;
        $this->assertNotSame('sk_test_encrypt_me_please', $raw);
        $this->assertSame('sk_test_encrypt_me_please', Crypt::decryptString($raw));
    }

    public function test_webauthn_credential_model(): void
    {
        $admin = User::query()->where('role', 'platform_admin')->firstOrFail();
        $cred = WebauthnCredential::query()->create([
            'user_id' => $admin->id,
            'credential_id' => 'cred_abc',
            'credential_id_hash' => hash('sha256', 'cred_abc'),
            'public_key' => base64_encode('pk'),
            'credential_record' => '{}',
            'name' => 'MacBook',
            'sign_count' => 0,
        ]);

        $this->assertSame($admin->id, $cred->user_id);
        $this->assertSame('MacBook', $cred->name);
    }
}
