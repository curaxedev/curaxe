<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Auth\LoginOtpMail;
use App\Mail\Registration\WelcomeProfessionalMail;
use App\Mail\Registration\WelcomeSeekerMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function professionalPayload(): array
    {
        return [
            'email' => 'nuova.badante@example.com',
            'firstName' => 'Lucia',
            'lastName' => 'Verdi',
            'role' => 'badante',
            'address' => ['line' => 'Milano centro', 'comune' => 'Milano', 'cap' => '20121'],
            'consents' => [
                'termini' => true,
                'privacy' => true,
                'maggiorenne' => true,
                'comunicazioni' => true,
                'profilazione' => false,
            ],
            'payload' => [
                'languages' => ['italiano'],
                'skills' => ['igiene personale'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function seekerPayload(): array
    {
        return [
            'email' => 'famiglia.nuova@example.com',
            'fullName' => 'Anna Neri',
            'careType' => 'anziani',
            'forWhom' => 'genitore',
            'address' => ['line' => 'Roma, Prati'],
            'consents' => [
                'termini' => true,
                'privacy' => true,
                'maggiorenne' => true,
            ],
        ];
    }

    public function test_professional_registration_creates_user_consents_and_sends_welcome(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/registrations/professional', $this->professionalPayload());

        $response->assertCreated()
            ->assertJsonPath('intent', 'offer')
            ->assertJsonPath('emailVerificationRequired', true);

        $user = User::query()->where('email', 'nuova.badante@example.com')->firstOrFail();
        $this->assertSame(UserRole::Professional, $user->role);
        $this->assertSame('Lucia Verdi', $user->name);
        $this->assertNull($user->email_verified_at);

        $this->assertDatabaseHas('consent_records', [
            'user_id' => $user->id,
            'termini' => true,
            'comunicazioni' => true,
            'profilazione' => false,
            'source' => 'registration',
        ]);
        $this->assertDatabaseHas('registrations', ['user_id' => $user->id, 'intent' => 'offer']);

        Mail::assertQueued(WelcomeProfessionalMail::class, function (WelcomeProfessionalMail $mail) {
            return str_contains($mail->verificationUrl, '/api/v1/email/verify/');
        });
    }

    public function test_seeker_registration_creates_public_user(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/registrations/seeker', $this->seekerPayload());

        $response->assertCreated()
            ->assertJsonPath('intent', 'seeker')
            ->assertJsonPath('emailVerificationRequired', false);

        $user = User::query()->where('email', 'famiglia.nuova@example.com')->firstOrFail();
        $this->assertSame(UserRole::PublicUser, $user->role);

        Mail::assertQueued(WelcomeSeekerMail::class);
    }

    public function test_registration_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'nuova.badante@example.com']);

        $this->postJson('/api/v1/registrations/professional', $this->professionalPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_requires_mandatory_consents(): void
    {
        $payload = $this->professionalPayload();
        $payload['consents']['termini'] = false;

        $this->postJson('/api/v1/registrations/professional', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['consents.termini']);
    }

    public function test_registration_rejects_minors(): void
    {
        $payload = $this->professionalPayload();
        $payload['birthDate'] = now()->subYears(17)->format('Y-m-d');

        $this->postJson('/api/v1/registrations/professional', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['birthDate']);
    }

    public function test_signed_verification_link_marks_email_verified(): void
    {
        Mail::fake();
        $this->postJson('/api/v1/registrations/professional', $this->professionalPayload())->assertCreated();

        $url = null;
        Mail::assertQueued(WelcomeProfessionalMail::class, function (WelcomeProfessionalMail $mail) use (&$url) {
            $url = $mail->verificationUrl;

            return true;
        });

        $user = User::query()->where('email', 'nuova.badante@example.com')->firstOrFail();
        $this->assertNull($user->email_verified_at);

        $this->get($url)->assertRedirect(config('app.frontend_url').'/accedi?verifica=ok');

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_tampered_verification_link_is_rejected(): void
    {
        Mail::fake();
        $this->postJson('/api/v1/registrations/professional', $this->professionalPayload())->assertCreated();

        $user = User::query()->where('email', 'nuova.badante@example.com')->firstOrFail();

        $this->get('/api/v1/email/verify/'.$user->id.'/'.sha1($user->email))
            ->assertForbidden();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_otp_login_marks_email_verified(): void
    {
        Mail::fake();
        $this->postJson('/api/v1/registrations/professional', $this->professionalPayload())->assertCreated();

        $this->postJson('/api/v1/auth/email-otp/request', ['email' => 'nuova.badante@example.com'])
            ->assertStatus(202);

        $code = null;
        Mail::assertQueued(LoginOtpMail::class, function (LoginOtpMail $mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        $this->postJson('/api/v1/auth/email-otp/verify', [
            'email' => 'nuova.badante@example.com',
            'code' => $code,
        ])->assertOk();

        $user = User::query()->where('email', 'nuova.badante@example.com')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
    }
}
