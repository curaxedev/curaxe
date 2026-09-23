<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController
{
    /**
     * Endpoint del link firmato nelle email di benvenuto. Al termine
     * reindirizza sempre alla SPA con l'esito nel query param.
     */
    public function __invoke(Request $request, int $id, string $hash): RedirectResponse
    {
        $frontend = config('app.frontend_url');

        $user = User::query()->find($id);
        if ($user === null || ! hash_equals(sha1($user->email), $hash)) {
            return redirect()->away($frontend.'/accedi?verifica=non-valida');
        }

        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return redirect()->away($frontend.'/accedi?verifica=ok');
    }
}
