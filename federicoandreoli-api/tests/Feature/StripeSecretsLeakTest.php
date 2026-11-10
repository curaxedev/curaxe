<?php

namespace Tests\Feature;

use App\Models\BillingSetting;
use App\Models\User;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StripeSecretsLeakTest extends TestCase
{
    use RefreshDatabase;

    private const PLAIN_SECRET = 'sk_test_leak_proof_secret_value_123456';

    private const PLAIN_WHSEC = 'whsec_leak_proof_webhook_secret_abcdef';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
    }

    public function test_secrets_encrypted_and_hidden_from_admin_payload(): void
    {
        $settings = BillingSetting::current();
        $settings->setSecretKey(self::PLAIN_SECRET);
        $settings->setWebhookSecret(self::PLAIN_WHSEC);
        $settings->save();

        $raw = $settings->fresh()->getAttributes();
        $this->assertNotSame(self::PLAIN_SECRET, $raw['secret_key_encrypted'] ?? null);
        $this->assertSame(self::PLAIN_SECRET, Crypt::decryptString($raw['secret_key_encrypted']));

        $array = $settings->fresh()->toArray();
        $this->assertArrayNotHasKey('secret_key_encrypted', $array);
        $this->assertArrayNotHasKey('webhook_secret_encrypted', $array);

        $admin = User::query()->where('email', 'admin@assistenzafacile.it')->firstOrFail();
        Sanctum::actingAs($admin);

        $payload = $this->getJson('/api/v1/admin/billing/settings')->assertOk()->json();
        $blob = json_encode($payload, JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString(self::PLAIN_SECRET, $blob);
        $this->assertStringNotContainsString(self::PLAIN_WHSEC, $blob);
        $this->assertStringNotContainsString('sk_test_leak', $blob);
        $this->assertTrue($payload['hasSecretKey'] ?? false);
        $this->assertNotEmpty($payload['secretKeyHint'] ?? null);
    }
}
