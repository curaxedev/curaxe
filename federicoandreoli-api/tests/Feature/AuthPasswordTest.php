<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Domains\Auth\Services\Totp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthPasswordTest extends TestCase
{
    use RefreshDatabase;

    private function agencyUser(?string $totpSecret = null): User
    {
        return User::factory()->create([
            'email' => 'info@auracare.it',
            'role' => UserRole::Agency,
            'password' => 'DemoPass123!',
            'totp_secret' => $totpSecret,
        ]);
    }

    public function test_login_with_valid_credentials_returns_token(): void
    {
        $user = $this->agencyUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'DemoPass123!',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'role', 'name', 'email']])
            ->assertJsonPath('user.role', 'agency');
    }

    public function test_login_with_wrong_password_returns_generic_error(): void
    {
        $user = $this->agencyUser();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'sbagliata!',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'password_invalid');
    }

    public function test_login_with_unknown_email_returns_same_generic_error(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'sconosciuto@example.com',
            'password' => 'qualsiasi',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'password_invalid');
    }

    public function test_login_for_otp_account_returns_otp_only(): void
    {
        User::factory()->create([
            'email' => 'maria.rossi@email.it',
            'role' => UserRole::Professional,
            'password' => null,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'maria.rossi@email.it',
            'password' => 'qualsiasi',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'otp_only');
    }

    public function test_login_with_totp_enabled_requires_code(): void
    {
        $secret = Totp::generateSecret();
        $user = $this->agencyUser($secret);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'DemoPass123!',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'totp_required');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'DemoPass123!',
            'totp_code' => '000000',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'totp_invalid');

        $validCode = (new Totp)->codeAt($secret, time());
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'DemoPass123!',
            'totp_code' => $validCode,
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = $this->agencyUser();

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'DemoPass123!',
        ])->json('token');

        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])
            ->assertNoContent();

        // La guard cachea l'utente risolto nella stessa esecuzione di test: reset esplicito.
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/user', ['Authorization' => "Bearer {$token}"])
            ->assertUnauthorized();
    }

    public function test_user_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/v1/user')->assertUnauthorized();
    }
}
