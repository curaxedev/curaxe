<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->api(prepend: [
            \App\Http\Middleware\SecurityHeaders::class,
        ]);
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserRole::class,
            'turnstile' => \App\Http\Middleware\VerifyTurnstile::class,
        ]);

        // Cloudflare: IP reale del client per rate-limit / audit (solo se abilitato).
        if (filter_var(env('CLOUDFLARE_TRUST_PROXIES', false), FILTER_VALIDATE_BOOL)) {
            $proxies = env('CLOUDFLARE_PROXIES', '*');
            $at = $proxies === '*'
                ? '*'
                : array_values(array_filter(array_map('trim', explode(',', (string) $proxies))));

            $middleware->trustProxies(
                at: $at,
                headers: Request::HEADER_X_FORWARDED_FOR
                    | Request::HEADER_X_FORWARDED_HOST
                    | Request::HEADER_X_FORWARDED_PORT
                    | Request::HEADER_X_FORWARDED_PROTO
                    | Request::HEADER_X_FORWARDED_PREFIX,
            );
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Le rotte API rispondono sempre JSON ({ message, errors }), mai HTML.
        $exceptions->shouldRenderJsonWhen(
            fn ($request) => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Support\ApiResponse::error('Non autenticato.', 401, [], 'unauthorized');
            }
        });

        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Support\ApiResponse::error(
                    $e->getMessage() !== '' ? $e->getMessage() : 'Non autorizzato.',
                    403,
                    [],
                    'forbidden',
                );
            }
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Support\ApiResponse::error('Risorsa non trovata.', 404, [], 'not_found');
            }
        });

        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Support\ApiResponse::error(
                    'Troppe richieste. Riprova tra poco.',
                    429,
                    [],
                    'rate_limited',
                );
            }
        });
    })->create();
