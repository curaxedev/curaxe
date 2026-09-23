<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Uso: ->middleware('role:professional') oppure 'role:agency,structure'. */
class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! in_array($user->role->value, $roles, true)) {
            return response()->json([
                'message' => 'Non hai i permessi per questa operazione.',
            ], 403);
        }

        return $next($request);
    }
}
