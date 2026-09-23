<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiMetaTest extends TestCase
{
    use RefreshDatabase;

    public function test_meta_endpoint_returns_json(): void
    {
        $response = $this->getJson('/api/v1/meta');

        $response->assertOk()
            ->assertJsonPath('version', 1)
            ->assertJsonStructure(['name', 'version']);
    }

    public function test_auth_policies_endpoint(): void
    {
        $response = $this->getJson('/api/v1/auth/policies');

        $response->assertOk()
            ->assertJsonStructure(['roles_to_auth_channel', 'channels']);
    }

    public function test_email_otp_request_validation(): void
    {
        $response = $this->postJson('/api/v1/auth/email-otp/request', []);

        $response->assertUnprocessable();
    }

    public function test_email_otp_request_accepts_valid_email(): void
    {
        $response = $this->postJson('/api/v1/auth/email-otp/request', [
            'email' => 'user@example.com',
        ]);

        $response->assertStatus(202);
    }
}
