<?php

namespace App\Http\Middleware;

use App\Services\Auth\AdminStepUpService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Blocca i token Sanctum scoped `admin.recovery` dalle route admin complete.
 */
final class EnsureFullAdminToken
{
    public function __construct(
        private readonly AdminStepUpService $stepUp,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $this->stepUp->assertFullAdminToken($request);
        } catch (HttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'recovery_session_only',
            ], $e->getStatusCode());
        }

        return $next($request);
    }
}
