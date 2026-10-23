<?php

namespace App\Http\Middleware;

use App\Services\Auth\AdminStepUpService;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Middleware step_up:{action} — richiede X-Step-Up-Token se Sicurezza totale è attiva.
 */
final class EnsureAdminStepUp
{
    public function __construct(
        private readonly AdminStepUpService $stepUp,
    ) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $action): Response
    {
        try {
            $this->stepUp->requireIfEnabled($request, $action);
        } catch (HttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'step_up_required',
                'action' => $action,
            ], $e->getStatusCode());
        }

        return $next($request);
    }
}
