<?php

namespace App\Domains\Auth\Enums;

enum UserRole: string
{
    case PlatformAdmin = 'platform_admin';
    case Professional = 'professional';
    case Agency = 'agency';
    case Structure = 'structure';
    case PublicUser = 'public_user';
}
