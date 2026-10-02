<?php

namespace Tests\Feature;

use App\Mail\Messaging\NewMessageMail;
use App\Models\User;
use Database\Seeders\DemoUsersSeeder;
use Database\Seeders\DirectoryDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MessagingBillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
        $this->seed(DirectoryDemoSeeder::class);
    }

    public function test_direct_contact_and_message_flow(): void
    {
        Mail::fake();
        $family = User::query()->where('email', 'bianchi@email.it')->firstOrFail();
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($family);

        $thread = $this->postJson('/api/v1/messaging/threads/direct-contact', [
            'professionalId' => (string) $pro->id,
            'professionalName' => 'Maria Rossi',
            'initialMessage' => 'Buongiorno, cerca assistenza?',
        ])
            ->assertCreated()
            ->json();

        Mail::assertSent(NewMessageMail::class);

        $this->getJson('/api/v1/messaging/threads')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/v1/messaging/threads/'.$thread['id'].'/messages')
            ->assertOk()
            ->assertJsonPath('0.body', 'Buongiorno, cerca assistenza?');

        Sanctum::actingAs($pro);
        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('notifications.0.read', false);
    }

    public function test_unauthenticated_messaging_returns_401_not_login_route_500(): void
    {
        $this->get('/api/v1/messaging/threads', [
            'Accept' => '*/*',
            'Origin' => 'http://localhost:5173',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('error_code', 'unauthorized');
    }

    public function test_billing_checkout_complete_and_cancel(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        $session = $this->postJson('/api/v1/billing/checkout-sessions', [
            'audience' => 'professional',
        ])
            ->assertCreated()
            ->json();

        $this->postJson('/api/v1/billing/checkout-sessions/'.$session['sessionId'].'/complete')
            ->assertOk()
            ->assertJsonPath('status', 'active');

        $this->postJson('/api/v1/billing/subscription/cancel')
            ->assertOk()
            ->assertJsonPath('cancelAtPeriodEnd', true);
    }
}
