<?php

namespace App\Domains\Auth\Services;

use App\Domains\Auth\Enums\AuthChannel;
use App\Domains\Auth\Enums\UserRole;

final class AuthChannelResolver
{
    /**
     * Canale di autenticazione previsto per il ruolo (policy di progetto).
     */
    public function channelForRole(UserRole $role): AuthChannel
    {
        return match ($role) {
            UserRole::PlatformAdmin,
            UserRole::Agency,
            UserRole::Structure => AuthChannel::PasswordTotp,
            UserRole::Professional,
            UserRole::PublicUser => AuthChannel::OtpEmail,
        };
    }
}
