<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Auth\LoginOtpMail;
use App\Models\AdminSecuritySetting;
use App\Models\LoginOtp;
use App\Models\User;
use App\Models\WebauthnCredential;
use App\Support\AdminSensitiveAction;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * AuthZ / privacy checks for admin hard-delete of users.
 */
class AdminUserDeletionSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
    }

    private function admin(): User
    {
        return User::query()->where('email', 'admin@assistenzafacile.it')->firstOrFail();
    }

    private function targetPro(): User
    {
        return User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
    }

    private function seedPasskey(User $admin): void
    {
        $credentialId = 'cred_'.uniqid('', true);
        WebauthnCredential::query()->create([
            'user_id' => $admin->id,
            'credential_id' => $credentialId,
            'credential_id_hash' => hash('sha256', $credentialId),
            'public_key' => base64_encode('pk'),
            'credential_record' => '{}',
            'name' => 'Test key',
            'sign_count' => 0,
            'transports' => ['internal'],
            'aaguid' => '00000000-0000-0000-0000-000000000000',
        ]);
    }

    public function test_guest_cannot_delete_user(): void
    {
        $pro = $this->targetPro();

        $this->deleteJson('/api/v1/admin/users/'.$pro->id, [
            'confirm_email' => $pro->email,
        ])->assertUnauthorized();

        $this->assertDatabaseHas('users', ['id' => $pro->id]);
    }

    public function test_non_admin_cannot_delete_user_idor(): void
    {
        $pro = $this->targetPro();
        $other = User::factory()->create([
            'email' => 'other.pro.delete@example.com',
            'role' => UserRole::Professional,
            'password' => null,
        ]);
        Sanctum::actingAs($other);

        $this->deleteJson('/api/v1/admin/users/'.$pro->id, [
            'confirm_email' => $pro->email,
        ])->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $pro->id]);
    }

    public function test_family_user_cannot_delete_via_admin_endpoint(): void
    {
        $pro = $this->targetPro();
        $family = User::factory()->create([
            'email' => 'family.delete@example.com',
            'role' => UserRole::PublicUser,
            'password' => null,
        ]);
        Sanctum::actingAs($family);

        $this->deleteJson('/api/v1/admin/users/'.$pro->id, [
            'confirm_email' => $pro->email,
        ])->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $pro->id]);
    }

    public function test_delete_requires_confirm_email_matching_target(): void
    {
        $admin = $this->admin();
        $pro = $this->targetPro();
        Sanctum::actingAs($admin);

        $this->deleteJson('/api/v1/admin/users/'.$pro->id)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['confirm_email']);

        $this->deleteJson('/api/v1/admin/users/'.$pro->id, [
            'confirm_email' => 'wrong@example.com',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'validation');

        $this->assertDatabaseHas('users', ['id' => $pro->id]);
    }

    public function test_admin_cannot_delete_self_or_other_admin(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $this->deleteJson('/api/v1/admin/users/'.$admin->id, [
            'confirm_email' => $admin->email,
        ])->assertUnprocessable();

        $otherAdmin = User::factory()->create([
            'email' => 'second.admin@example.com',
            'role' => UserRole::PlatformAdmin,
            'password' => 'DemoPass123!',
        ]);

        $this->deleteJson('/api/v1/admin/users/'.$otherAdmin->id, [
            'confirm_email' => $otherAdmin->email,
        ])->assertUnprocessable();

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        $this->assertDatabaseHas('users', ['id' => $otherAdmin->id]);
    }

    public function test_security_total_requires_step_up_token_on_delete(): void
    {
        $admin = $this->admin();
        $this->seedPasskey($admin);
        $settings = AdminSecuritySetting::forUser($admin);
        $settings->security_total_enabled = true;
        $settings->security_total_enabled_at = now();
        $settings->save();

        $pro = $this->targetPro();
        Sanctum::actingAs($admin);

        $this->deleteJson('/api/v1/admin/users/'.$pro->id, [
            'confirm_email' => $pro->email,
        ])
            ->assertForbidden()
            ->assertJsonPath('error_code', 'step_up_required')
            ->assertJsonPath('action', AdminSensitiveAction::USERS_MUTATE);

        $this->assertDatabaseHas('users', ['id' => $pro->id]);
    }

    public function test_delete_with_step_up_and_confirm_email_purges_auth_artifacts(): void
    {
        Mail::fake();
        $admin = $this->admin();
        $this->seedPasskey($admin);
        $settings = AdminSecuritySetting::forUser($admin);
        $settings->security_total_enabled = true;
        $settings->security_total_enabled_at = now();
        $settings->save();

        $pro = $this->targetPro();
        $pro->createToken('spa');
        LoginOtp::query()->create([
            'email' => strtolower($pro->email),
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
        ]);
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => strtolower($pro->email)],
            ['token' => Hash::make('reset'), 'created_at' => now()],
        );

        Sanctum::actingAs($admin);
        $token = bin2hex(random_bytes(32));
        cache()->put('admin-stepup-token:'.hash('sha256', $token), [
            'user_id' => $admin->id,
            'action' => AdminSensitiveAction::USERS_MUTATE,
            'exp' => now()->addMinutes(4)->timestamp,
        ], now()->addMinutes(4));

        $this->deleteJson('/api/v1/admin/users/'.$pro->id, [
            'confirm_email' => $pro->email,
        ], [
            'X-Step-Up-Token' => $token,
        ])->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $pro->id]);
        $this->assertSame(0, LoginOtp::query()->where('email', strtolower($pro->email))->count());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => strtolower($pro->email)]);

        // Post-delete login OTP must stay opaque and not send mail.
        $this->postJson('/api/v1/auth/email-otp/request', ['email' => $pro->email])
            ->assertStatus(202);
        Mail::assertNotSent(LoginOtpMail::class);
    }
}
