<?php

namespace Tests\Feature;

use App\Domains\Auth\Enums\UserRole;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\PlatformSetting;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Platform\PlatformSettingsReader;
use Database\Seeders\DemoUsersSeeder;
use Database\Seeders\DirectoryDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlatformFeatureGateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
        $this->seed(DirectoryDemoSeeder::class);
        PlatformSettingsReader::bump();
    }

    public function test_public_platform_config_endpoint(): void
    {
        $this->getJson('/api/v1/platform/config')
            ->assertOk()
            ->assertJsonPath('featureFlags.b2bJobPostings', true)
            ->assertJsonPath('freeLimits.maxRequestsPerMonth', 3)
            ->assertJsonMissingPath('commissionRates');
    }

    public function test_b2b_job_postings_flag_blocks_create(): void
    {
        $this->patchPlatform(['featureFlags' => ['b2bJobPostings' => false]]);

        $agency = User::query()->where('email', 'info@auracare.it')->firstOrFail();
        Sanctum::actingAs($agency);

        $this->postJson('/api/v1/b2b/job-postings', $this->jobPayload())
            ->assertStatus(503)
            ->assertJsonPath('error_code', 'feature_disabled');
    }

    public function test_stripe_checkout_flag_blocks_checkout(): void
    {
        $this->patchPlatform(['featureFlags' => ['stripeCheckout' => false]]);

        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        $this->postJson('/api/v1/billing/checkout-sessions', [])
            ->assertStatus(503)
            ->assertJsonPath('error_code', 'feature_disabled');
    }

    public function test_family_messaging_flag_blocks_direct_contact(): void
    {
        $this->patchPlatform(['featureFlags' => ['familyMessaging' => false]]);

        $family = User::query()->where('email', 'bianchi@email.it')->firstOrFail();
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($family);

        $this->postJson('/api/v1/messaging/threads/direct-contact', [
            'professionalId' => (string) $pro->id,
            'professionalName' => $pro->name,
            'initialMessage' => 'Buongiorno, cerca assistenza?',
        ])
            ->assertStatus(503)
            ->assertJsonPath('error_code', 'feature_disabled');
    }

    public function test_free_request_month_limit_enforced(): void
    {
        $this->patchPlatform(['freeLimits' => ['maxRequestsPerMonth' => 1]]);

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

    public function test_free_application_limit_enforced_and_premium_bypass(): void
    {
        $this->patchPlatform(['freeLimits' => ['maxActiveApplications' => 1]]);

        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        $agency = User::query()->where('email', 'info@auracare.it')->firstOrFail();
        $jobs = JobPosting::query()->where('user_id', $agency->id)->where('status', 'active')->take(2)->get();
        if ($jobs->count() < 2) {
            $this->markTestSkipped('Serve almeno 2 job attivi demo.');
        }

        Sanctum::actingAs($pro);
        $this->postJson('/api/v1/applications/job-postings/'.$jobs[0]->id, [])->assertCreated();
        $this->postJson('/api/v1/applications/job-postings/'.$jobs[1]->id, [])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'plan_limit');

        Subscription::query()->updateOrCreate(
            ['user_id' => $pro->id],
            [
                'plan_type' => 'professional_premium_monthly',
                'status' => 'active',
                'audience' => 'professional',
            ],
        );

        $this->postJson('/api/v1/applications/job-postings/'.$jobs[1]->id, [])->assertCreated();
        $this->assertSame(2, Application::query()->where('applicant_id', $pro->id)->count());
    }

    public function test_admin_cannot_mutate_commission_rates_via_settings(): void
    {
        $admin = User::query()->where('role', UserRole::PlatformAdmin)->firstOrFail();
        Sanctum::actingAs($admin);

        $before = $this->getJson('/api/v1/admin/settings')->assertOk()->json('commissionRates.professionalPercent');

        $this->patchJson('/api/v1/admin/settings', [
            'commissionRates' => [
                'professionalPercent' => 99,
                'agencyPercent' => 99,
                'active' => true,
            ],
        ])->assertOk();

        $after = $this->getJson('/api/v1/admin/settings')->assertOk()->json();
        $this->assertSame($before, $after['commissionRates']['professionalPercent']);
        $this->assertFalse($after['commissionRates']['active']);
        $this->assertTrue($after['commissionRates']['plannedOnly']);
    }

    /**
     * @param  array<string, mixed>  $patch
     */
    private function patchPlatform(array $patch): void
    {
        $row = PlatformSetting::query()->firstOrCreate(['key' => 'platform'], ['value' => []]);
        $current = is_array($row->value) ? $row->value : [];
        foreach ($patch as $key => $value) {
            if (is_array($value) && isset($current[$key]) && is_array($current[$key])) {
                $current[$key] = array_replace($current[$key], $value);
            } else {
                $current[$key] = $value;
            }
        }
        $row->value = $current;
        $row->save();
        PlatformSettingsReader::bump();
    }

    /**
     * @return array<string, mixed>
     */
    private function jobPayload(): array
    {
        return [
            'title' => 'OSS notturno',
            'roleId' => 'oss',
            'contractType' => 'indeterminato',
            'description' => 'Turno notturno in struttura.',
            'requirementsText' => "OSS\nDisponibilità notturna",
            'location' => ['comune' => 'Milano', 'address' => 'Via Roma 1'],
            'compensation' => ['minAmount' => 1600, 'maxAmount' => 1800, 'period' => 'monthly'],
            'availability' => ['days' => ['Lun', 'Mar']],
            'publishAs' => 'draft',
        ];
    }
}
