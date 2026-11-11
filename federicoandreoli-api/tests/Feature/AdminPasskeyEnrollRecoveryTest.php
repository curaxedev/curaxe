<?php

namespace Tests\Feature;

use App\Models\AdminRecoveryCode;
use App\Models\AdminSecuritySetting;
use App\Models\User;
use App\Models\WebauthnCredential;
use App\Services\Auth\AdminRecoveryService;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPasskeyEnrollRecoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
        Mail::fake();
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
            'transports' => ['internal'],
            'aaguid' => '00000000-0000-0000-0000-000000000000',
        ]);
    }

    public function test_additional_passkey_register_requires_enroll_otp_not_step_up(): void
    {
        $admin = $this->admin();
        $this->seedPasskey($admin);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/passkeys/register/options', [
            'name' => 'iPhone',
        ])
            ->assertForbidden()
            ->assertJsonPath('error_code', 'enroll_otp_required');
    }

    public function test_enroll_otp_send_requires_alert_emails(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/passkeys/enroll/otp/send')
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'enroll_otp_error');
    }

    public function test_enroll_otp_send_and_verify_issues_token(): void
    {
        $admin = $this->admin();
        $settings = AdminSecuritySetting::forUser($admin);
        $settings->login_alert_emails = ['ops@example.com', 'backup@example.com'];
        $settings->save();
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/passkeys/enroll/otp/send')
            ->assertOk()
            ->assertJsonPath('emailCount', 2);

        /** @var AdminEnrollOtpService $svc */
        $svc = app(AdminEnrollOtpService::class);
        // Inject known OTP into cache for verify.
        cache()->put('admin-passkey-enroll-otp:'.$admin->id, [
            'hash' => Hash::make('12345678'),
            'challenge_id' => 'x',
            'attempts' => 0,
        ], now()->addMinutes(10));

        $this->postJson('/api/v1/admin/passkeys/enroll/otp/verify', [
            'code' => '12345678',
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'expiresAt']);
    }

    public function test_password_login_blocked_when_disabled(): void
    {
        $admin = $this->admin();
        $this->seedPasskey($admin);
        $settings = AdminSecuritySetting::forUser($admin);
        $settings->password_login_enabled = false;
        $settings->login_alert_emails = ['ops@example.com'];
        $settings->save();

        $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'DemoPass123!',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'password_login_disabled');
    }

    public function test_login_options_reflect_passkey_and_password_flags(): void
    {
        $admin = $this->admin();
        $this->seedPasskey($admin);
        $settings = AdminSecuritySetting::forUser($admin);
        $settings->password_login_enabled = false;
        $settings->login_alert_emails = ['ops@example.com'];
        $settings->save();

        $this->postJson('/api/v1/auth/admin/login-options', [
            'email' => $admin->email,
        ])
            ->assertOk()
            ->assertJsonPath('passkeyAvailable', true)
            ->assertJsonPath('passwordAllowed', false)
            ->assertJsonPath('recoveryAvailable', true);
    }

    public function test_recovery_code_issues_scoped_token(): void
    {
        $admin = $this->admin();
        $this->seedPasskey($admin);
        /** @var AdminRecoveryService $recovery */
        $recovery = app(AdminRecoveryService::class);
        $codes = $recovery->regenerateCodes($admin);
        $plain = $codes[0];

        $res = $this->postJson('/api/v1/auth/admin/recovery/code', [
            'email' => $admin->email,
            'code' => $plain,
        ])
            ->assertOk()
            ->assertJsonPath('recoverySession', true);

        $token = $res->json('token');
        $this->assertNotEmpty($token);

        // Recovery token cannot hit full admin settings.
        $this->withToken($token)
            ->getJson('/api/v1/admin/security/settings')
            ->assertForbidden()
            ->assertJsonPath('error_code', 'recovery_session_only');

        // Recovery token can hit recovery enroll options (not blocked by full_admin).
        $reg = $this->withToken($token)
            ->postJson('/api/v1/admin/recovery/passkeys/register/options', [
                'name' => 'Recovery device',
            ]);
        $this->assertNotSame(
            403,
            $reg->status(),
            'Recovery session must not be blocked by full_admin: '.$reg->getContent(),
        );
        $this->assertContains($reg->status(), [200, 422]);
    }

    public function test_cannot_delete_last_passkey_when_password_off(): void
    {
        $admin = $this->admin();
        $pk = $this->seedPasskey($admin);
        $settings = AdminSecuritySetting::forUser($admin);
        $settings->password_login_enabled = false;
        $settings->save();
        Sanctum::actingAs($admin);

        // Without step-up when security total off but ≥1 passkey still requires step-up for delete.
        $this->deleteJson('/api/v1/admin/passkeys/'.$pk->id)
            ->assertForbidden();

        // Simulate step-up token
        $token = 'test-step-up-token';
        cache()->put('admin-stepup-token:'.hash('sha256', $token), [
            'user_id' => $admin->id,
            'action' => 'passkey.manage',
            'exp' => now()->addMinutes(4)->timestamp,
        ], now()->addMinutes(4));

        $this->deleteJson('/api/v1/admin/passkeys/'.$pk->id, [], [
            'X-Step-Up-Token' => $token,
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'passkey_error');

        $this->assertDatabaseHas('webauthn_credentials', ['id' => $pk->id]);
    }

    public function test_recovery_codes_are_hashed(): void
    {
        $admin = $this->admin();
        $codes = app(AdminRecoveryService::class)->regenerateCodes($admin);
        $row = AdminRecoveryCode::query()->where('user_id', $admin->id)->first();
        $this->assertNotNull($row);
        $this->assertNotSame($codes[0], $row->code_hash);
        $this->assertTrue(Hash::check(
            strtoupper(preg_replace('/[^A-Z0-9]/', '', $codes[0]) ?? ''),
            $row->code_hash,
        ));
    }
}
