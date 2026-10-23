<?php

namespace Tests\Feature;

use Database\Seeders\DemoUsersSeeder;
use Database\Seeders\DirectoryDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->seed(DemoUsersSeeder::class);
        $this->seed(DirectoryDemoSeeder::class);
    }

    public function test_profiles_list_returns_paginated_summaries(): void
    {
        $this->getJson('/api/v1/profiles?intent=cerco&page=1&pageSize=12')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'category', 'type', 'match' => ['comune', 'regione']]],
                'meta' => ['total', 'page', 'pageSize', 'totalPages'],
            ])
            ->assertJsonPath('meta.total', fn ($total) => $total >= 2);
    }

    public function test_profiles_filter_by_comune(): void
    {
        $response = $this->getJson('/api/v1/profiles?comune=Milano')->assertOk();
        foreach ($response->json('data') as $row) {
            $this->assertStringContainsStringIgnoringCase('milano', $row['match']['comune'].' '.$row['locationLabel']);
        }
    }

    public function test_profiles_filter_matches_primary_zone_without_comune_column(): void
    {
        $user = \App\Models\User::factory()->create([
            'role' => \App\Domains\Auth\Enums\UserRole::Professional,
        ]);
        \App\Models\ProfessionalProfile::query()->create([
            'user_id' => $user->id,
            'first_name' => 'Test',
            'last_name' => 'TorinoOnly',
            'category' => 'caregiver',
            'is_published' => true,
            'primary_zone' => 'torino',
            'comune' => '',
            'regione' => '',
            'istat' => '',
        ]);
        Cache::flush();

        $response = $this->getJson('/api/v1/profiles?comune=Torino&regione=Piemonte&intent=cerco')->assertOk();
        $names = collect($response->json('data'))->pluck('name')->implode(' ');
        $this->assertStringContainsStringIgnoringCase('TorinoOnly', $names);
    }

    public function test_show_profile_returns_detail(): void
    {
        $list = $this->getJson('/api/v1/profiles')->assertOk()->json('data');
        $professional = collect($list)->firstWhere('type', 'professional');
        $this->assertNotNull($professional);

        $this->getJson('/api/v1/profiles/'.$professional['id'])
            ->assertOk()
            ->assertJsonPath('id', $professional['id'])
            ->assertJsonStructure(['bio', 'competences', 'availability', 'verified']);
    }

    public function test_show_profile_404(): void
    {
        $this->getJson('/api/v1/profiles/999999')
            ->assertNotFound()
            ->assertJsonPath('error_code', 'not_found');
    }

    public function test_show_structure(): void
    {
        $this->getJson('/api/v1/structures/org-1')
            ->assertOk()
            ->assertJsonStructure(['id', 'kind', 'name', 'branches', 'services']);
    }

    public function test_open_positions_list_and_show(): void
    {
        $list = $this->getJson('/api/v1/open-positions?citta=Milano')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'title', 'category']], 'meta'])
            ->json('data');

        $this->assertNotEmpty($list);

        $this->getJson('/api/v1/open-positions/'.$list[0]['id'])
            ->assertOk()
            ->assertJsonPath('id', $list[0]['id']);
    }
}
