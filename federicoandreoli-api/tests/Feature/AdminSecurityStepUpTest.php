<?php

namespace Tests\Feature;

use App\Models\AdminSecuritySetting;
use App\Models\User;
use App\Models\WebauthnCredential;
use App\Services\Auth\AdminStepUpService;
use App\Support\AdminSensitiveAction;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSecurityStepUpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
    }

    private function admin(): User
    {
        return User::query()->where('role', 'platform_admin')->firstOrFail();
    }

    private function seedPasskey(User $admin): WebauthnCredential
    {
        $credentialId = 'cred_'.uniqid('', true);

        return WebauthnCredential::query()->create([
            'user_id' => $admin->id,
            'credential_id' => $credentialId,
            'credential_id_hash' => hash('sha256', $credentialId),
            'public_key' => base64_encode('pk'),
            'credential_record' => '{}',
            'name' => 'Mac / iCloud',
            'sign_count' => 0,
            'transports' => ['internal', 'hybrid'],
            'aaguid' => '00000000-0000-0000-0000-000000000000',
        ]);
    }

    private function enableSecurityTotal(User $admin): void
    {
        $this->seedPasskey($admin);
        $settings = AdminSecuritySetting::forUser($admin);
        $settings->security_total_enabled = true;
        $settings->security_total_enabled_at = now();
        $settings->save();
    }

    public function test_registration_options_do_not_force_platform_attachment(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $payload = $this->postJson('/api/v1/admin/passkeys/register/options', [
            'name' => 'Chiavetta YubiKey',
        ])
            ->assertOk()
            ->json();

        $this->assertArrayHasKey('challengeId', $payload);
        $this->assertArrayHasKey('options', $payload);
        $attachment = $payload['options']['authenticatorSelection']['authenticatorAttachment'] ?? null;
        $this->assertTrue(
            $attachment === null || $attachment === '' || $attachment === 'null',
            'Attachment must not be forced to platform; got: '.json_encode($attachment),
        );
        $this->assertSame(
            'required',
            $payload['options']['authenticatorSelection']['userVerification'] ?? null,
        );
    }

    public function test_security_total_requires_passkey_to_enable(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $this->putJson('/api/v1/admin/security/settings', [
            'securityTotalEnabled' => true,
        ])
            ->assertStatus(403)
            ->assertJsonPath('error_code', 'step_up_required');

        // Even with a forged step-up path skipped: without passkeys enabling is blocked after consume.
        // Simulate: no passkeys → cannot begin step-up.
        $this->postJson('/api/v1/admin/security/step-up/options', [
            'action' => AdminSensitiveAction::SECURITY_SETTINGS,
        ])
            ->assertUnprocessable();
    }

    public function test_step_up_required_on_sensitive_route_when_enabled(): void
    {
        $admin = $this->admin();
        $this->enableSecurityTotal($admin);
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/users/'.$pro->id.'/suspend')
            ->assertForbidden()
            ->assertJsonPath('error_code', 'step_up_required')
            ->assertJsonPath('action', AdminSensitiveAction::USERS_MUTATE);
    }

    public function test_step_up_token_is_single_use_and_bound_to_action(): void
    {
        $admin = $this->admin();
        $this->enableSecurityTotal($admin);
        Sanctum::actingAs($admin);

        $stepUp = app(AdminStepUpService::class);
        $token = bin2hex(random_bytes(32));
        cache()->put('admin-stepup-token:'.hash('sha256', $token), [
            'user_id' => $admin->id,
            'action' => AdminSensitiveAction::USERS_MUTATE,
            'exp' => now()->addMinutes(4)->timestamp,
        ], now()->addMinutes(4));

        $this->assertTrue($stepUp->consume($admin, AdminSensitiveAction::USERS_MUTATE, $token));
        $this->assertFalse($stepUp->consume($admin, AdminSensitiveAction::USERS_MUTATE, $token));

        $token2 = bin2hex(random_bytes(32));
        cache()->put('admin-stepup-token:'.hash('sha256', $token2), [
            'user_id' => $admin->id,
            'action' => AdminSensitiveAction::BILLING_REFUND,
            'exp' => now()->addMinutes(4)->timestamp,
        ], now()->addMinutes(4));

        $this->assertFalse($stepUp->consume($admin, AdminSensitiveAction::USERS_MUTATE, $token2));
        $this->assertTrue($stepUp->consume($admin, AdminSensitiveAction::BILLING_REFUND, $token2));
    }

    public function test_valid_step_up_token_allows_user_suspend(): void
    {
        $admin = $this->admin();
        $this->enableSecurityTotal($admin);
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($admin);

        $token = bin2hex(random_bytes(32));
        cache()->put('admin-stepup-token:'.hash('sha256', $token), [
            'user_id' => $admin->id,
            'action' => AdminSensitiveAction::USERS_MUTATE,
            'exp' => now()->addMinutes(4)->timestamp,
        ], now()->addMinutes(4));

        $this->postJson('/api/v1/admin/users/'.$pro->id.'/suspend', [], [
            'X-Step-Up-Token' => $token,
        ])
            ->assertOk()
            ->assertJsonPath('status', 'suspended');
    }

    public function test_cannot_delete_last_passkey_when_security_total_on(): void
    {
        $admin = $this->admin();
        $cred = $this->seedPasskey($admin);
        $settings = AdminSecuritySetting::forUser($admin);
        $settings->security_total_enabled = true;
        $settings->security_total_enabled_at = now();
        $settings->save();
        Sanctum::actingAs($admin);

        $token = bin2hex(random_bytes(32));
        cache()->put('admin-stepup-token:'.hash('sha256', $token), [
            'user_id' => $admin->id,
            'action' => AdminSensitiveAction::PASSKEY_MANAGE,
            'exp' => now()->addMinutes(4)->timestamp,
        ], now()->addMinutes(4));

        $this->deleteJson('/api/v1/admin/passkeys/'.$cred->id, [], [
            'X-Step-Up-Token' => $token,
        ])
            ->assertUnprocessable();

        $this->assertDatabaseHas('webauthn_credentials', ['id' => $cred->id]);
    }

    public function test_passkey_list_includes_transports(): void
    {
        $admin = $this->admin();
        $this->seedPasskey($admin);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/passkeys')
            ->assertOk()
            ->assertJsonPath('passkeys.0.transports.0', 'internal');
    }

    public function test_login_alerts_and_settings_payload(): void
    {
        $admin = $this->admin();
        $this->seedPasskey($admin);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/security/settings')
            ->assertOk()
            ->assertJsonPath('canEnableSecurityTotal', true)
            ->assertJsonPath('securityTotalEnabled', false)
            ->assertJsonStructure(['sensitiveActions', 'devices', 'loginAlertEmails']);

        $this->putJson('/api/v1/admin/security/settings', [
            'loginAlertsEnabled' => true,
            'loginAlertEmails' => ['alerts@example.com', 'ops@example.com'],
        ])
            ->assertOk()
            ->assertJsonPath('loginAlertsEnabled', true)
            ->assertJsonPath('loginAlertEmails.0', 'alerts@example.com');
    }

    public function test_suspended_admin_cannot_password_login(): void
    {
        $admin = $this->admin();
        $admin->forceFill([
            'password' => 'DemoPass123!',
            'suspended_at' => now(),
        ])->save();

        $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'DemoPass123!',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'account_suspended');
    }

    public function test_billing_settings_keys_require_step_up_when_enabled(): void
    {
        $admin = $this->admin();
        $this->enableSecurityTotal($admin);
        Sanctum::actingAs($admin);

        $this->putJson('/api/v1/admin/billing/settings', [
            'publishableKey' => 'pk_test_abc123456789',
            'secretKey' => 'sk_test_abc123456789xyz',
        ])
            ->assertForbidden()
            ->assertJsonPath('error_code', 'step_up_required')
            ->assertJsonPath('action', AdminSensitiveAction::BILLING_STRIPE_KEYS);
    }
}
