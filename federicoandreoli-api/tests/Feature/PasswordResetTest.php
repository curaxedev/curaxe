<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Auth\PasswordResetMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function passwordUser(): User
    {
        return User::factory()->create([
            'email' => 'info@auracare.it',
            'role' => UserRole::Agency,
            'password' => 'VecchiaPass123!',
        ]);
    }

    /** Richiede il reset e ritorna il token in chiaro estratto dal link email. */
    private function requestResetAndCaptureToken(string $email): string
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/password-reset/request', ['email' => $email])
            ->assertStatus(202);

        $url = null;
        Mail::assertQueued(PasswordResetMail::class, function (PasswordResetMail $mail) use (&$url) {
            $url = $mail->resetUrl;

            return true;
        });

        $this->assertNotNull($url);
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $this->assertArrayHasKey('token', $query);

        return $query['token'];
    }

    public function test_request_sends_email_with_frontend_link(): void
    {
        $user = $this->passwordUser();

        $token = $this->requestResetAndCaptureToken($user->email);

        $this->assertNotSame('', $token);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
        // Il token è salvato hashato, mai in chiaro.
        $this->assertDatabaseMissing('password_reset_tokens', ['token' => $token]);
    }

    public function test_request_for_unknown_email_returns_202_without_mail(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/password-reset/request', ['email' => 'sconosciuto@example.com'])
            ->assertStatus(202);

        Mail::assertNothingOutgoing();
    }

    public function test_request_for_otp_account_returns_otp_only_account(): void
    {
        User::factory()->create([
            'email' => 'maria.rossi@email.it',
            'role' => UserRole::Professional,
            'password' => null,
        ]);

        $this->postJson('/api/v1/auth/password-reset/request', ['email' => 'maria.rossi@email.it'])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'otp_only_account');
    }

    public function test_validate_token_returns_payload(): void
    {
        $user = $this->passwordUser();
        $token = $this->requestResetAndCaptureToken($user->email);

        $this->getJson('/api/v1/auth/password-reset/validate?token='.$token.'&email='.urlencode($user->email))
            ->assertOk()
            ->assertJsonPath('email', $user->email)
            ->assertJsonStructure(['email', 'expiresAt']);
    }

    public function test_validate_invalid_token_returns_error(): void
    {
        $user = $this->passwordUser();
        $this->requestResetAndCaptureToken($user->email);

        $this->getJson('/api/v1/auth/password-reset/validate?token=finto&email='.urlencode($user->email))
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'token_invalid');
    }

    public function test_validate_expired_token_returns_error(): void
    {
        $user = $this->passwordUser();
        $token = $this->requestResetAndCaptureToken($user->email);

        $this->travel(61)->minutes();

        $this->getJson('/api/v1/auth/password-reset/validate?token='.$token.'&email='.urlencode($user->email))
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'token_expired');
    }

    public function test_confirm_updates_password_and_revokes_sessions(): void
    {
        $user = $this->passwordUser();
        $oldToken = $user->createToken('spa')->plainTextToken;
        $token = $this->requestResetAndCaptureToken($user->email);

        $this->postJson('/api/v1/auth/password-reset/confirm', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NuovaPass456!',
            'password_confirmation' => 'NuovaPass456!',
        ])->assertNoContent();

        // Vecchia password rifiutata, nuova accettata.
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'VecchiaPass123!',
        ])->assertUnprocessable();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'NuovaPass456!',
        ])->assertOk();

        // Le sessioni precedenti sono revocate e il token di reset è monouso.
        $this->getJson('/api/v1/user', ['Authorization' => "Bearer {$oldToken}"])
            ->assertUnauthorized();
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_confirm_rejects_weak_password(): void
    {
        $user = $this->passwordUser();
        $token = $this->requestResetAndCaptureToken($user->email);

        $this->postJson('/api/v1/auth/password-reset/confirm', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'corta',
            'password_confirmation' => 'corta',
        ])->assertUnprocessable();
    }
}
