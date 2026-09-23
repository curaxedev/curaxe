<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Applications\ApplicationReceivedMail;
use App\Mail\Applications\ApplicationStatusChangedMail;
use App\Models\Application;
use App\Models\FamilyRequest;
use App\Models\JobPosting;
use App\Models\User;
use Database\Seeders\DemoUsersSeeder;
use Database\Seeders\DirectoryDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FamilyRequestApplicationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
        $this->seed(DirectoryDemoSeeder::class);
    }

    public function test_family_can_create_and_list_requests(): void
    {
        $family = User::query()->where('email', 'bianchi@email.it')->firstOrFail();
        Sanctum::actingAs($family);

        $this->postJson('/api/v1/requests', [
            'assistanceType' => 'badante',
            'beneficiary' => 'non_autosufficient_elderly',
            'employmentType' => 'live_in',
            'comune' => 'Milano',
            'budgetMonthly' => 1500,
            'days' => ['Lun', 'Mar', 'Mer'],
            'notes' => 'Serve assistenza convivente.',
        ])
            ->assertCreated()
            ->assertJsonPath('comune', 'Milano')
            ->assertJsonPath('status', 'active');

        $this->getJson('/api/v1/requests')
            ->assertOk()
            ->assertJsonPath('requests.0.comune', 'Milano');
    }

    public function test_plan_limit_blocks_second_active_request(): void
    {
        $family = User::query()->where('email', 'bianchi@email.it')->firstOrFail();
        Sanctum::actingAs($family);

        $payload = [
            'assistanceType' => 'oss',
            'beneficiary' => 'self_sufficient_elderly',
            'employmentType' => 'hourly',
            'comune' => 'Monza',
            'days' => ['Lun'],
            'notes' => '',
        ];

        $this->postJson('/api/v1/requests', $payload)->assertCreated();
        $this->postJson('/api/v1/requests', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'plan_limit');
    }

    public function test_professional_can_apply_to_job_and_status_transitions(): void
    {
        Mail::fake();

        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        $agency = User::query()->where('email', 'info@auracare.it')->firstOrFail();
        $job = JobPosting::query()->where('user_id', $agency->id)->firstOrFail();

        Sanctum::actingAs($pro);
        $created = $this->postJson('/api/v1/applications/job-postings/'.$job->id, [
            'message' => 'Sono disponibile subito.',
        ])
            ->assertCreated()
            ->assertJsonPath('status', 'submitted')
            ->json();

        Mail::assertQueued(ApplicationReceivedMail::class);

        Sanctum::actingAs($agency);
        $this->patchJson('/api/v1/applications/'.$created['id'], ['status' => 'viewed'])
            ->assertOk()
            ->assertJsonPath('status', 'viewed');

        Mail::assertQueued(ApplicationStatusChangedMail::class);

        $this->patchJson('/api/v1/applications/'.$created['id'], ['status' => 'hired'])
            ->assertUnprocessable();
    }

    public function test_professional_can_apply_to_family_request(): void
    {
        Mail::fake();
        $family = User::query()->where('email', 'bianchi@email.it')->firstOrFail();
        $request = FamilyRequest::query()->create([
            'user_id' => $family->id,
            'title' => 'Cerco badante — Milano',
            'status' => 'active',
            'assistance_type' => 'badante',
            'beneficiary' => 'non_autosufficient_elderly',
            'employment_type' => 'live_in',
            'comune' => 'Milano',
            'budget_monthly' => 1400,
            'days' => ['Lun', 'Mar'],
            'notes' => '',
        ]);

        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        $this->postJson('/api/v1/applications/family-requests/'.$request->id)
            ->assertCreated()
            ->assertJsonPath('targetType', 'family_request');

        $this->assertDatabaseCount('applications', 1);
        Mail::assertQueued(ApplicationReceivedMail::class);
    }

    public function test_duplicate_application_rejected(): void
    {
        $family = User::query()->where('email', 'bianchi@email.it')->firstOrFail();
        $request = FamilyRequest::query()->create([
            'user_id' => $family->id,
            'title' => 'Cerco OSS — Milano',
            'status' => 'active',
            'assistance_type' => 'oss',
            'beneficiary' => 'disabled',
            'employment_type' => 'hourly',
            'comune' => 'Milano',
            'days' => ['Mer'],
            'notes' => '',
        ]);

        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        $this->postJson('/api/v1/applications/family-requests/'.$request->id)->assertCreated();
        $this->postJson('/api/v1/applications/family-requests/'.$request->id)
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'duplicate');
    }
}
