<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Domains\Auth\Services\AuthChannelResolver;
use Illuminate\Http\JsonResponse;

class AuthPoliciesController
{
    public function __invoke(AuthChannelResolver $resolver): JsonResponse
    {
        $map = [];
        foreach (UserRole::cases() as $role) {
            $map[$role->value] = $resolver->channelForRole($role)->value;
        }

        return response()->json([
            'roles_to_auth_channel' => $map,
            'channels' => [
                'otp_email' => [
                    'label' => 'Codice via email',
                    'description' => 'Accesso senza password con codice monouso.',
                ],
                'password_totp' => [
                    'label' => 'Password e verifica',
                    'description' => 'Password e secondo fattore per account struttura, agenzia e admin.',
                ],
            ],
        ]);
    }
}
