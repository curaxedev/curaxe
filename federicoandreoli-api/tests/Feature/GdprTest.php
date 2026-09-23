<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Registration\AccountDeletedMail;
use App\Models\ConsentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class GdprTest extends TestCase
{
    use RefreshDatabase;

    private function userWithConsents(): User
    {
        $user = User::factory()->create(['role' => UserRole::PublicUser]);

        ConsentRecord::query()->create([
            'user_id' => $user->id,
            'termini' => true,
            'privacy' => true,
            'maggiorenne' => true,
            'comunicazioni' => false,
            'profilazione' => false,
            'version' => ConsentRecord::POLICY_VERSION,
            'source' => 'registration',
        ]);

        return $user;
    }

    public function test_consents_endpoint_requires_auth(): void
    {
        $this->getJson('/api/v1/gdpr/consents')->assertUnauthorized();
    }

    public function test_show_consents_returns_latest_record(): void
    {
        $user = $this->userWithConsents();

        $this->actingAs($user)
            ->getJson('/api/v1/gdpr/consents')
            ->assertOk()
            ->assertJsonPath('termini', true)
            ->assertJsonPath('comunicazioni', false)
            ->assertJsonPath('source', 'registration')
            ->assertJsonPath('version', ConsentRecord::POLICY_VERSION);
    }

    public function test_update_optional_consents_appends_new_record(): void
    {
        $user = $this->userWithConsents();

        $this->actingAs($user)
            ->patchJson('/api/v1/gdpr/consents', ['comunicazioni' => true])
            ->assertOk()
            ->assertJsonPath('comunicazioni', true)
            ->assertJsonPath('profilazione', false)
            ->assertJsonPath('source', 'settings');

        // Storico preservato: registrazione + aggiornamento.
        $this->assertSame(2, ConsentRecord::query()->where('user_id', $user->id)->count());
    }

    public function test_update_consents_without_record_returns_error(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patchJson('/api/v1/gdpr/consents', ['comunicazioni' => true])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'not_found');
    }

    public function test_export_returns_user_data_with_consent_history(): void
    {
        $user = $this->userWithConsents();

        $this->actingAs($user)
            ->postJson('/api/v1/gdpr/export')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonStructure([
                'exportedAt',
                'user' => ['id', 'name', 'email', 'role'],
                'consents',
                'consentHistory',
                'registration',
            ]);
    }

    public function test_delete_account_requires_matching_email(): void
    {
        $user = $this->userWithConsents();

        $this->actingAs($user)
            ->deleteJson('/api/v1/account', ['confirm_email' => 'sbagliata@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['confirm_email']);

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_delete_account_erases_user_and_sends_confirmation(): void
    {
        Mail::fake();
        $user = $this->userWithConsents();

        $this->actingAs($user)
            ->deleteJson('/api/v1/account', ['confirm_email' => $user->email])
            ->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('consent_records', ['user_id' => $user->id]);

        Mail::assertQueued(AccountDeletedMail::class);
    }
}
