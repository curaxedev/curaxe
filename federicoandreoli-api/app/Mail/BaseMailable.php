<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Base per le email transazionali della piattaforma.
 *
 * Invio **sincrono** verso Resend (niente coda): su Hostinger il worker
 * cron è fragile e OTP/welcome non possono aspettare. Le view estendono
 * `emails.layout` (brand Care & Trust).
 *
 * Se in futuro serve una coda affidabile (Supervisor/VPS), si può
 * reintrodurre `ShouldQueue` solo per mail non urgenti.
 */
abstract class BaseMailable extends Mailable
{
    use SerializesModels;
}
