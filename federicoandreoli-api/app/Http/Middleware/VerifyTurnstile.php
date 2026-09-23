<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifica Cloudflare Turnstile quando abilitato.
 * Header o body: cf-turnstile-response / turnstileToken.
 */
class VerifyTurnstile
{
    /**
     * @param  \Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $cfg = config('cloudflare.turnstile', []);
        $enabled = (bool) ($cfg['enabled'] ?? false);
        $secret = $cfg['secret_key'] ?? null;

        if (! $enabled || ! is_string($secret) || $secret === '') {
            return $next($request);
        }

        $token = $request->input('turnstileToken')
            ?? $request->input('cf-turnstile-response')
            ?? $request->header('CF-Turnstile-Token');

        if (! is_string($token) || $token === '') {
            return ApiResponse::error(
                'Completa la verifica anti-bot (Turnstile).',
                422,
                [],
                'turnstile_required',
            );
        }

        try {
            $response = Http::asForm()->timeout(5)->post((string) $cfg['verify_url'], [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $request->ip(),
            ]);
        } catch (\Throwable) {
            return ApiResponse::error(
                'Verifica anti-bot temporaneamente non disponibile. Riprova.',
                503,
                [],
                'turnstile_unavailable',
            );
        }

        $ok = (bool) ($response->json('success') ?? false);
        if (! $ok) {
            return ApiResponse::error(
                'Verifica anti-bot non riuscita. Riprova.',
                422,
                [],
                'turnstile_failed',
            );
        }

        return $next($request);
    }
}
