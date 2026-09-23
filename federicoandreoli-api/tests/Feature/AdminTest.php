<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
    }

    public function test_admin_can_list_and_suspend_user(): void
    {
        $admin = User::query()->where('email', 'admin@assistenzafacile.it')->firstOrFail();
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonFragment(['email' => 'maria.rossi@email.it']);

        $this->postJson('/api/v1/admin/users/'.$pro->id.'/suspend')
            ->assertOk()
            ->assertJsonPath('status', 'suspended');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.suspend',
            'subject_id' => (string) $pro->id,
        ]);

        $this->postJson('/api/v1/admin/users/'.$pro->id.'/reactivate')
            ->assertOk()
            ->assertJsonPath('status', 'active');
    }

    public function test_non_admin_cannot_access_admin_users(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        Sanctum::actingAs($pro);

        $this->getJson('/api/v1/admin/users')->assertForbidden();
    }
}
