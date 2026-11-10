<?php

namespace Tests\Feature;

use App\Models\ProfessionalProfile;
use App\Models\User;
use App\Support\DirectoryCache;
use Database\Seeders\DemoUsersSeeder;
use Database\Seeders\DirectoryDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DirectorySuspendVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoUsersSeeder::class);
        $this->seed(DirectoryDemoSeeder::class);
        DirectoryCache::bump();
    }

    public function test_suspended_professional_disappears_from_public_directory(): void
    {
        $pro = User::query()->where('email', 'maria.rossi@email.it')->firstOrFail();
        ProfessionalProfile::query()->where('user_id', $pro->id)->update(['is_published' => true]);
        DirectoryCache::bump();

        $this->getJson('/api/v1/profiles?intent=cerco')
            ->assertOk()
            ->assertJsonFragment(['id' => (string) $pro->id]);

        $admin = User::query()->where('email', 'admin@assistenzafacile.it')->firstOrFail();
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/admin/users/'.$pro->id.'/suspend')->assertOk();

        $this->getJson('/api/v1/profiles?intent=cerco')
            ->assertOk()
            ->assertJsonMissing(['id' => (string) $pro->id]);

        $this->getJson('/api/v1/profiles/'.$pro->id)
            ->assertNotFound();
    }
}
