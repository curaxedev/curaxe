<?php

namespace Tests\Feature;

use App\Mail\B2B\TeamInviteMail;
use App\Models\User;
use Database\Seeders\DemoUsersSeeder;
use Database\Seeders\DirectoryDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class B2BTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
        $this->seed(DirectoryDemoSeeder::class);
    }

    public function test_agency_overview_and_profile_update(): void
    {
        $agency = User::query()->where('email', 'info@auracare.it')->firstOrFail();
        Sanctum::actingAs($agency);

        $this->getJson('/api/v1/b2b/overview')
            ->assertOk()
            ->assertJsonStructure(['organization', 'stats', 'chartLast30Days', 'latestPostings']);

        $this->patchJson('/api/v1/b2b/organization', [
            'name' => 'AuraCare Plus',
            'bio' => 'Nuova descrizione agenzia.',
            'coverageHint' => 'Milano e provincia',
            'services' => ['Badanti', 'OSS'],
        ])
            ->assertOk()
            ->assertJsonPath('organization.name', 'AuraCare Plus');
    }

    public function test_agency_can_create_and_pause_job_posting(): void
    {
        $agency = User::query()->where('email', 'info@auracare.it')->firstOrFail();
        Sanctum::actingAs($agency);

        $created = $this->postJson('/api/v1/b2b/job-postings', [
            'roleId' => 'caregiver',
            'title' => 'Badante weekend Milano',
            'description' => 'Cerchiamo badante per weekend in zona sud.',
            'requirementsText' => "Esperienza\nItaliano fluente",
            'availability' => ['days' => ['Sab', 'Dom'], 'scheduleNotes' => 'Weekend', 'startDate' => ''],
            'compensation' => ['minAmount' => 12, 'maxAmount' => 14, 'period' => 'hourly', 'notes' => ''],
            'contractType' => 'part_time',
            'location' => ['comune' => 'Milano', 'provincia' => 'MI', 'cap' => '20100', 'address' => ''],
            'department' => 'Domicilio',
            'publishAs' => 'active',
        ])
            ->assertCreated()
            ->assertJsonPath('status', 'active')
            ->json();

        $this->patchJson('/api/v1/b2b/job-postings/'.$created['id'], ['publishAs' => 'paused'])
            ->assertOk()
            ->assertJsonPath('status', 'paused');
    }

    public function test_team_invite_sends_mail(): void
    {
        Mail::fake();
        $agency = User::query()->where('email', 'info@auracare.it')->firstOrFail();
        Sanctum::actingAs($agency);

        $this->postJson('/api/v1/organizations/1/team-members/invite', [
            'email' => 'recruiter@auracare.it',
            'role' => 'recruiter',
        ])
            ->assertCreated()
            ->assertJsonPath('email', 'recruiter@auracare.it');

        Mail::assertQueued(TeamInviteMail::class);
    }

    public function test_structure_staff_crud(): void
    {
        $structure = User::query()->where('email', 'info@villaserena.it')->firstOrFail();
        Sanctum::actingAs($structure);

        $orgId = $this->getJson('/api/v1/b2b/overview')->assertOk()->json('organization.id');

        $created = $this->postJson("/api/v1/organizations/{$orgId}/staff", [
            'name' => 'Giulia Neri',
            'role' => 'OSS',
            'shift' => 'Mattina',
            'status' => 'active',
        ])
            ->assertCreated()
            ->json();

        $this->patchJson("/api/v1/organizations/{$orgId}/staff/{$created['id']}", ['status' => 'on_leave'])
            ->assertOk()
            ->assertJsonPath('status', 'on_leave');

        $this->deleteJson("/api/v1/organizations/{$orgId}/staff/{$created['id']}")
            ->assertNoContent();
    }
}
