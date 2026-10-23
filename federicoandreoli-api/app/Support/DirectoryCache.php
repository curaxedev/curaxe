<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Cache directory senza Redis: chiave versionata (file/database store).
 * Evita Cache::flush() globale che invalida OTP e altro su hosting condiviso.
 */
final class DirectoryCache
{
    public const VERSION_KEY = 'directory.cache_version';

    /** TTL secondi per risposte ricerca (ripetizioni close non battono il DB). */
    public const TTL_SECONDS = 300;

    public static function version(): int
    {
        return (int) Cache::get(self::VERSION_KEY, 1);
    }

    public static function bump(): void
    {
        $next = self::version() + 1;
        Cache::forever(self::VERSION_KEY, $next);
    }

    public static function profilesKey(array $data): string
    {
        return 'directory.profiles.v'.self::version().'.'.md5(json_encode($data));
    }

    public static function openPositionsKey(array $data): string
    {
        return 'directory.open_positions.v'.self::version().'.'.md5(json_encode($data));
    }
}
