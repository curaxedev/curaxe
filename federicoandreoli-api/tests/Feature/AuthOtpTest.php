<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Auth\LoginOtpMail;
use App\Models\LoginOtp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthOtpTest extends TestCase
{
    use RefreshDatabase;

    private function otpUser(): User
    {
        return User::factory()->create([
            'email' => 'maria.rossi@email.it',
            'role' => UserRole::Professional,
            'password' => null,
        ]);
    }

    /** Richiede un OTP e ritorna il codice in chiaro catturato dalla mail. */
    private function requestOtpAndCaptureCode(string $email): string
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/email-otp/request', ['email' => $email])
            ->assertStatus(202);

        $code = null;
        Mail::assertQueued(LoginOtpMail::class, function (LoginOtpMail $mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        $this->assertNotNull($code);

        return $code;
    }

    public function test_request_sends_otp_email_and_persists_hash(): void
    {
        $user = $this->otpUser();

        $code = $this->requestOtpAndCaptureCode($user->email);

        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertDatabaseCount('login_otps', 1);
        $this->assertDatabaseMissing('login_otps', ['code_hash' => $code]);
    }

    public function test_request_for_unknown_email_returns_202_without_mail(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/email-otp/request', ['email' => 'sconosciuto@example.com'])
            ->assertStatus(202);

        Mail::assertNothingOutgoing();
        $this->assertDatabaseCount('login_otps', 0);
    }

    public function test_request_for_password_account_returns_password_required(): void
    {
        User::factory()->create([
            'email' => 'info@auracare.it',
            'role' => UserRole::Agency,
        ]);

        $this->postJson('/api/v1/auth/email-otp/request', ['email' => 'info@auracare.it'])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'password_required');
    }

    public function test_verify_with_correct_code_returns_token_and_user(): void
    {
        $user = $this->otpUser();
        $code = $this->requestOtpAndCaptureCode($user->email);

        $response = $this->postJson('/api/v1/auth/email-otp/verify', [
            'email' => $user->email,
            'code' => $code,
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'role', 'name', 'email']])
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.role', 'professional');

        $token = $response->json('token');
        $this->getJson('/api/v1/user', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('email', $user->email);
    }

    public function test_verify_with_wrong_code_returns_otp_invalid_and_increments_attempts(): void
    {
        $user = $this->otpUser();
        $this->requestOtpAndCaptureCode($user->email);

        $this->postJson('/api/v1/auth/email-otp/verify', [
            'email' => $user->email,
            'code' => '000001',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'otp_invalid');

        $this->assertSame(1, (int) LoginOtp::query()->first()->attempts);
    }

    public function test_verify_without_request_returns_otp_invalid(): void
    {
        $user = $this->otpUser();

        $this->postJson('/api/v1/auth/email-otp/verify', [
            'email' => $user->email,
            'code' => '123456',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'otp_invalid');
    }

    public function test_verify_expired_code_returns_otp_expired(): void
    {
        $user = $this->otpUser();
        $code = $this->requestOtpAndCaptureCode($user->email);

        $this->travel(11)->minutes();

        $this->postJson('/api/v1/auth/email-otp/verify', [
            'email' => $user->email,
            'code' => $code,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'otp_expired');
    }

    public function test_verify_after_max_attempts_returns_otp_expired(): void
    {
        $user = $this->otpUser();
        $code = $this->requestOtpAndCaptureCode($user->email);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/email-otp/verify', [
                'email' => $user->email,
                'code' => '000001',
            ])->assertUnprocessable();
        }

        // Anche con il codice giusto: tentativi esauriti, serve un nuovo codice.
        $this->postJson('/api/v1/auth/email-otp/verify', [
            'email' => $user->email,
            'code' => $code,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'otp_expired');
    }

    public function test_new_request_invalidates_previous_code(): void
    {
        $user = $this->otpUser();
        $firstCode = $this->requestOtpAndCaptureCode($user->email);
        $this->requestOtpAndCaptureCode($user->email);

        if ($firstCode === LoginOtp::query()->whereNull('consumed_at')->latest('id')->first()?->code_hash) {
            $this->fail('Il codice non deve essere salvato in chiaro.');
        }

        $this->assertSame(1, LoginOtp::query()->whereNull('consumed_at')->count());
    }
}
