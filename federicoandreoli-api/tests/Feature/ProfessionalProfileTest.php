<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Models\ProfessionalDocument;
use App\Models\ProfessionalProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfessionalProfileTest extends TestCase
{
    use RefreshDatabase;

    private function professional(): User
    {
        return User::factory()->create([
            'role' => UserRole::Professional,
            'password' => null,
        ]);
    }

    public function test_show_creates_profile_on_first_access(): void
    {
        $user = $this->professional();
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/professionals/me/profile')
            ->assertOk()
            ->assertJsonPath('id', (string) $user->id)
            ->assertJsonStructure([
                'id',
                'completionPercent',
                'missingFields',
                'identity' => ['firstName', 'lastName', 'photoUrl', 'bio'],
                'professional',
                'availability',
                'rates',
            ]);

        $this->assertDatabaseHas('professional_profiles', ['user_id' => $user->id]);
    }

    public function test_patch_updates_profile_fields(): void
    {
        $user = $this->professional();
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/professionals/me/profile', [
            'identity' => [
                'firstName' => 'Maria',
                'lastName' => 'Rossi',
                'bio' => 'Assistente familiare con esperienza in demenze e Alzheimer.',
                'professionalTitle' => 'Badante esperta — Milano',
            ],
            'professional' => [
                'category' => 'Badante',
                'experienceYears' => '6-9 anni',
                'specializations' => ['Alzheimer/Demenze'],
                'languages' => ['Italiano', 'Rumeno'],
            ],
            'rates' => ['hourly' => 14, 'monthlyLiveIn' => 1400],
            'zones' => ['Milano', 'Sesto'],
            'primaryZone' => 'Milano',
        ])
            ->assertOk()
            ->assertJsonPath('identity.firstName', 'Maria')
            ->assertJsonPath('professional.category', 'Badante')
            ->assertJsonPath('rates.hourly', 14)
            ->assertJsonPath('primaryZone', 'Milano');
    }

    public function test_upload_photo_stores_file_and_updates_url(): void
    {
        Storage::fake('public');
        $user = $this->professional();
        Sanctum::actingAs($user);

        $this->post('/api/v1/professionals/me/photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg', 400, 400),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('identity.photoUrl', fn ($url) => is_string($url) && str_contains($url, 'profile-photos'));

        $profile = ProfessionalProfile::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($profile?->photo_path);
        Storage::disk('public')->assertExists($profile->photo_path);
    }

    public function test_document_upload_list_and_delete(): void
    {
        Storage::fake('local');
        $user = $this->professional();
        Sanctum::actingAs($user);

        $this->post('/api/v1/professionals/me/documents', [
            'slot' => 'identita',
            'file' => UploadedFile::fake()->create('carta.pdf', 200, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('slot', 'identita')
            ->assertJsonPath('name', 'carta.pdf');

        $list = $this->getJson('/api/v1/professionals/me/documents')->assertOk()->json();
        $this->assertCount(1, $list);
        $id = $list[0]['id'];

        $this->deleteJson("/api/v1/professionals/me/documents/{$id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('professional_documents', ['id' => $id]);
    }

    public function test_non_professional_cannot_access_profile(): void
    {
        $user = User::factory()->create(['role' => UserRole::PublicUser]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/professionals/me/profile')->assertForbidden();
    }

    public function test_guest_cannot_access_profile(): void
    {
        $this->getJson('/api/v1/professionals/me/profile')->assertUnauthorized();
    }
}
