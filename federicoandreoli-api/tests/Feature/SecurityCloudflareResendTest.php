<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SecurityCloudflareResendTest extends TestCase
{
    use RefreshDatabase;

    public function test_security_meta_turnstile_disabled_by_default(): void
    {
        $this->getJson('/api/v1/security/meta')
            ->assertOk()
            ->assertJsonPath('turnstile.enabled', false)
            ->assertJsonPath('turnstile.siteKey', null);
    }

    public function test_turnstile_middleware_noop_when_disabled(): void
    {
        // Senza Turnstile abilitato, login validation procede (fallisce su credenziali, non su turnstile).
        $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password-here',
        ])
            ->assertStatus(422)
            ->assertJsonMissing(['error_code' => 'turnstile_required']);
    }

    public function test_turnstile_required_when_enabled(): void
    {
        config([
            'cloudflare.turnstile.enabled' => true,
            'cloudflare.turnstile.site_key' => 'site_test',
            'cloudflare.turnstile.secret_key' => 'secret_test',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password-here',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'turnstile_required');
    }

    public function test_turnstile_passes_with_valid_token(): void
    {
        config([
            'cloudflare.turnstile.enabled' => true,
            'cloudflare.turnstile.site_key' => 'site_test',
            'cloudflare.turnstile.secret_key' => 'secret_test',
        ]);

        Http::fake([
            'challenges.cloudflare.com/*' => Http::response(['success' => true], 200),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password-here',
            'turnstileToken' => 'tok_test',
        ])
            ->assertStatus(422)
            ->assertJsonMissing(['error_code' => 'turnstile_required']);
    }

    public function test_security_meta_exposes_site_key_when_enabled(): void
    {
        config([
            'cloudflare.turnstile.enabled' => true,
            'cloudflare.turnstile.site_key' => '0xPublicSiteKey',
            'cloudflare.turnstile.secret_key' => '0xSecretMustNotLeak',
        ]);

        $this->getJson('/api/v1/security/meta')
            ->assertOk()
            ->assertJsonPath('turnstile.enabled', true)
            ->assertJsonPath('turnstile.siteKey', '0xPublicSiteKey')
            ->assertJsonMissing(['0xSecretMustNotLeak']);
    }
}
