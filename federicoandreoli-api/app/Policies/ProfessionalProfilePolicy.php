<?php

namespace App\Policies;

use App\Domains\Auth\Enums\UserRole;
use App\Models\ProfessionalProfile;
use App\Models\User;

class ProfessionalProfilePolicy
{
    public function view(User $user, ProfessionalProfile $profile): bool
    {
        return $user->id === $profile->user_id || $user->role === UserRole::PlatformAdmin;
    }

    public function update(User $user, ProfessionalProfile $profile): bool
    {
        return $user->id === $profile->user_id && $user->role === UserRole::Professional;
    }
}
