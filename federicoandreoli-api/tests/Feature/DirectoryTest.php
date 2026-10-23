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

    public function test_profiles_filter_by_comune_uses_coverage(): void
    {
        $response = $this->getJson('/api/v1/profiles?comune=Milano')->assertOk();
        $this->assertGreaterThan(0, count($response->json('data')));
        $this->assertSame('coverage', $response->json('meta.geoMode'));
        foreach ($response->json('data') as $row) {
            $this->assertArrayHasKey('distanceKm', $row);
            $this->assertLessThanOrEqual((float) $row['coverageKm'], (float) $row['distanceKm'] + 0.0001);
        }
    }

    public function test_profiles_filter_matches_geocoded_primary_zone(): void
    {
        $user = \App\Models\User::factory()->create([
            'role' => \App\Domains\Auth\Enums\UserRole::Professional,
        ]);
        $geo = new \App\Support\ItaliaGeoIndex;
        $torino = $geo->byName('Torino');
        $this->assertNotNull($torino);

        \App\Models\ProfessionalProfile::query()->create([
            'user_id' => $user->id,
            'first_name' => 'Test',
            'last_name' => 'TorinoOnly',
            'category' => 'caregiver',
            'is_published' => true,
            'primary_zone' => 'Torino',
            'comune' => 'Torino',
            'regione' => 'Piemonte',
            'istat' => $torino['istat'],
            'lat' => $torino['lat'],
            'lng' => $torino['lng'],
            'radius_km' => 50,
        ]);
        Cache::flush();

        $response = $this->getJson('/api/v1/profiles?comune=Torino&intent=cerco')->assertOk();
        $names = collect($response->json('data'))->pluck('name')->implode(' ');
        $this->assertStringContainsStringIgnoringCase('TorinoOnly', $names);
    }

    public function test_pinerolo_search_includes_torino_within_coverage(): void
    {
        $user = \App\Models\User::factory()->create([
            'role' => \App\Domains\Auth\Enums\UserRole::Professional,
        ]);
        $geo = new \App\Support\ItaliaGeoIndex;
        $torino = $geo->byName('Torino');
        $this->assertNotNull($torino);

        \App\Models\ProfessionalProfile::query()->create([
            'user_id' => $user->id,
            'first_name' => 'Anna',
            'last_name' => 'TorinoCoverage',
            'category' => 'Badante',
            'is_published' => true,
            'primary_zone' => 'Torino',
            'comune' => 'Torino',
            'regione' => 'Piemonte',
            'istat' => $torino['istat'],
            'lat' => $torino['lat'],
            'lng' => $torino['lng'],
            'radius_km' => 50,
        ]);
        Cache::flush();

        $response = $this->getJson('/api/v1/profiles?comune=Pinerolo&intent=cerco')->assertOk();
        $row = collect($response->json('data'))->first(
            fn ($r) => str_contains(strtolower((string) $r['name']), 'torinocoverage'),
        );
        $this->assertNotNull($row, 'Torino con raggio 50km deve coprire Pinerolo (~34km)');
        $this->assertLessThanOrEqual(50, (float) $row['distanceKm']);
        $this->assertSame('coverage', $response->json('meta.geoMode'));
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
