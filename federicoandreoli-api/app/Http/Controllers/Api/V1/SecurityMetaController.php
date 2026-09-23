<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;

/**
 * Endpoint pubblico di meta sicurezza / integrazioni edge (Cloudflare Turnstile site key).
 * Nessun secret esposto.
 */
class SecurityMetaController
{
    public function __invoke(): JsonResponse
    {
        $turnstile = config('cloudflare.turnstile', []);
        $enabled = (bool) ($turnstile['enabled'] ?? false)
            && is_string($turnstile['site_key'] ?? null)
            && $turnstile['site_key'] !== ''
            && is_string($turnstile['secret_key'] ?? null)
            && $turnstile['secret_key'] !== '';

        return response()->json([
            'turnstile' => [
                'enabled' => $enabled,
                'siteKey' => $enabled ? $turnstile['site_key'] : null,
            ],
            'cloudflareTrustProxies' => (bool) config('cloudflare.trust_proxies'),
        ]);
    }
}
