<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Models\FamilyRequest;
use App\Models\ProfessionalDocument;
use App\Models\ProfessionalProfile;
use App\Models\User;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * Defensive (non-exploit) checks for classic web API risks.
 * Local/workspace only — no payloads against external systems.
 */
class DefensiveSecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
    }

    public function test_login_unknown_and_wrong_password_share_generic_error_code(): void
    {
        User::factory()->create([
            'email' => 'agency.lock@example.com',
            'role' => UserRole::Agency,
            'password' => 'DemoPass123!',
        ]);

        $unknown = $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'whatever',
        ])->assertUnprocessable();

        $wrong = $this->postJson('/api/v1/auth/login', [
            'email' => 'agency.lock@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable();

        $this->assertSame('password_invalid', $unknown->json('error_code'));
        $this->assertSame('password_invalid', $wrong->json('error_code'));
        $this->assertSame($unknown->json('message'), $wrong->json('message'));
    }

    public function test_suspended_user_cannot_login_with_password(): void
    {
        $user = User::factory()->create([
            'email' => 'suspended.agency@example.com',
            'role' => UserRole::Agency,
            'password' => 'DemoPass123!',
            'suspended_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'DemoPass123!',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'account_suspended');
    }

    public function test_suspend_revokes_existing_api_tokens(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        $pro->forceFill(['password' => 'DemoPass123!'])->save();
        $token = $pro->createToken('spa')->plainTextToken;

        $this->getJson('/api/v1/user', ['Authorization' => "Bearer {$token}"])->assertOk();

        $admin = User::query()->where('email', 'admin@assistenzafacile.it')->firstOrFail();
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/admin/users/'.$pro->id.'/suspend')->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/user', ['Authorization' => "Bearer {$token}"])->assertUnauthorized();
        $this->assertSame(0, $pro->fresh()->tokens()->count());
    }

    public function test_directory_query_special_chars_do_not_500(): void
    {
        $response = $this->getJson('/api/v1/profiles?intent=cerco&q='.urlencode("1' OR '1'='1"));
        $this->assertNotSame(500, $response->status());
        $this->assertFalse(
            str_contains(strtolower($response->getContent()), 'sqlstate'),
            'SQL error leaked to client',
        );
    }

    public function test_profile_bio_xss_string_returned_as_json_not_html(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);
        $payload = ['identity' => ['bio' => '<script>alert(1)</script>']];
        $this->patchJson('/api/v1/professionals/me/profile', $payload)->assertOk();

        ProfessionalProfile::query()->where('user_id', $pro->id)->update(['is_published' => true]);

        $show = $this->getJson('/api/v1/profiles/'.$pro->id);
        $show->assertOk();
        $this->assertStringContainsString('application/json', (string) $show->headers->get('Content-Type'));
        $blob = $show->getContent();
        $this->assertStringContainsString('<script>alert(1)</script>', $blob);
        $this->assertStringNotContainsString('<html', strtolower($blob));
    }

    public function test_admin_routes_require_auth_and_role(): void
    {
        $this->getJson('/api/v1/admin/users')->assertUnauthorized();

        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);
        $this->getJson('/api/v1/admin/users')->assertForbidden();
    }

    public function test_registration_cannot_self_assign_platform_admin_role(): void
    {
        $response = $this->postJson('/api/v1/registrations/professional', [
            'email' => 'attacker.role@example.com',
            'firstName' => 'Attack',
            'lastName' => 'Role',
            'role' => 'platform_admin',
            'address' => ['line' => 'Milano centro'],
            'consents' => [
                'termini' => true,
                'privacy' => true,
                'maggiorenne' => true,
            ],
        ]);

        $this->assertTrue(in_array($response->status(), [201, 422], true));
        $user = User::query()->where('email', 'attacker.role@example.com')->first();
        if ($user !== null) {
            $this->assertSame(UserRole::Professional, $user->role);
            $this->assertNotSame(UserRole::PlatformAdmin, $user->role);
        }
    }

    public function test_family_request_idor_update_blocked(): void
    {
        $owner = User::query()->where('email', 'bianchi@email.it')->firstOrFail();
        $other = User::factory()->create([
            'role' => UserRole::PublicUser,
            'email' => 'other.family@example.com',
            'password' => null,
        ]);

        $request = FamilyRequest::query()->create([
            'user_id' => $owner->id,
            'title' => 'Assistenza',
            'status' => 'active',
            'assistance_type' => 'anziani',
            'comune' => 'Milano',
        ]);

        Sanctum::actingAs($other);
        $this->patchJson('/api/v1/requests/'.$request->id, [
            'status' => 'closed',
        ])->assertNotFound();

        $this->assertSame('active', $request->fresh()->status);
    }

    public function test_document_destroy_idor_blocked(): void
    {
        Storage::fake();
        $owner = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        $other = User::factory()->create([
            'role' => UserRole::Professional,
            'email' => 'other.pro@example.com',
            'password' => null,
        ]);

        $doc = ProfessionalDocument::query()->create([
            'user_id' => $owner->id,
            'slot' => 'identita',
            'original_name' => 'id.pdf',
            'path' => 'professional-documents/'.$owner->id.'/id.pdf',
            'mime' => 'application/pdf',
            'size_bytes' => 100,
        ]);

        Sanctum::actingAs($other);
        $this->deleteJson('/api/v1/professionals/me/documents/'.$doc->id)->assertNotFound();
        $this->assertNotNull(ProfessionalDocument::query()->find($doc->id));
    }

    public function test_login_rate_limiter_trips_after_burst(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'rate.limit@example.com',
                'password' => 'nope',
            ]);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'rate.limit@example.com',
            'password' => 'nope',
        ])->assertStatus(429);
    }

    public function test_expired_sanctum_token_is_rejected(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::Agency,
            'password' => 'DemoPass123!',
        ]);
        $plain = $user->createToken('spa')->plainTextToken;
        /** @var PersonalAccessToken $pat */
        $pat = $user->tokens()->firstOrFail();
        $pat->forceFill([
            'created_at' => now()->subDays(3),
            'expires_at' => now()->subMinute(),
        ])->save();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/user', ['Authorization' => "Bearer {$plain}"])->assertUnauthorized();
    }

    public function test_cors_config_does_not_allow_star_with_credentials(): void
    {
        $origins = config('cors.allowed_origins');
        $this->assertIsArray($origins);
        $this->assertNotContains('*', $origins);
        $this->assertTrue((bool) config('cors.supports_credentials'));
    }

    public function test_user_resource_does_not_expose_secrets(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::Agency,
            'password' => 'DemoPass123!',
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
        ]);
        Sanctum::actingAs($user);

        $payload = $this->getJson('/api/v1/user')->assertOk()->json();
        $blob = json_encode($payload, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('email', $payload);
        $this->assertArrayNotHasKey('password', $payload);
        $this->assertArrayNotHasKey('totp_secret', $payload);
        $this->assertStringNotContainsString('JBSWY3DPEHPK3PXP', $blob);
        $this->assertStringNotContainsString('DemoPass123!', $blob);
    }

    public function test_document_upload_rejects_php_extension(): void
    {
        Storage::fake();
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        $file = UploadedFile::fake()->create('shell.php', 20, 'application/x-php');
        $this->post('/api/v1/professionals/me/documents', [
            'slot' => 'identita',
            'file' => $file,
        ], [
            'Accept' => 'application/json',
        ])->assertStatus(422);
    }

    public function test_otp_request_does_not_enumerate_password_accounts(): void
    {
        User::factory()->create([
            'email' => 'info@auracare.it',
            'role' => UserRole::Agency,
            'password' => 'DemoPass123!',
        ]);

        $this->postJson('/api/v1/auth/email-otp/request', [
            'email' => 'info@auracare.it',
        ])->assertStatus(202);

        $this->postJson('/api/v1/auth/email-otp/request', [
            'email' => 'missing@example.com',
        ])->assertStatus(202);
    }

    public function test_sanctum_expiration_configured(): void
    {
        $expiration = config('sanctum.expiration');
        $this->assertNotNull($expiration);
        $this->assertGreaterThan(0, (int) $expiration);
    }
}
