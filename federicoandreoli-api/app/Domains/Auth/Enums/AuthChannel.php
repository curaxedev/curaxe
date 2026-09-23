<?php

namespace App\Domains\Auth\Enums;

enum AuthChannel: string
{
    /** Accesso tramite codice inviato per email (es. badanti, onboarding leggero pubblico). */
    case OtpEmail = 'otp_email';

    /** Password + secondo fattore TOTP (admin, agenzie, strutture B2B). */
    case PasswordTotp = 'password_totp';
}
