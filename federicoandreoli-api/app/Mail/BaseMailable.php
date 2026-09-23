<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Base per tutte le email transazionali della piattaforma.
 *
 * - Sempre in coda (`ShouldQueue`, connessione database) per non bloccare le richieste HTTP.
 * - Le view estendono `emails.layout` (brand Care & Trust).
 */
abstract class BaseMailable extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;
}
