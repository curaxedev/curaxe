<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Foto profilo: upload su disco pubblico, oppure preset SVG (`preset:profile-01`).
 */
final class ProfilePhoto
{
    public const PRESET_PREFIX = 'preset:';

    /** Limite Laravel `max:` in kilobyte (10 MB). */
    public const MAX_UPLOAD_KB = 10240;

    /** @var list<string> */
    public const PRESET_IDS = [
        'profile-01',
        'profile-02',
        'profile-03',
        'profile-04',
        'profile-05',
        'profile-06',
        'profile-07',
        'profile-08',
        'profile-09',
        'profile-10',
    ];

    public static function isPreset(?string $path): bool
    {
        return is_string($path) && str_starts_with($path, self::PRESET_PREFIX);
    }

    public static function presetIdFromPath(?string $path): ?string
    {
        if (! self::isPreset($path)) {
            return null;
        }

        $id = substr((string) $path, strlen(self::PRESET_PREFIX));

        return in_array($id, self::PRESET_IDS, true) ? $id : null;
    }

    public static function pathForPreset(string $presetId): string
    {
        return self::PRESET_PREFIX.$presetId;
    }

    public static function isValidPresetId(string $presetId): bool
    {
        return in_array($presetId, self::PRESET_IDS, true);
    }

    public static function publicUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $presetId = self::presetIdFromPath($path);
        if ($presetId !== null) {
            return '/images/profiles/'.$presetId.'.svg';
        }

        return Storage::disk('public')->url($path);
    }

    public static function defaultPublicUrl(): string
    {
        return '/images/profiles/profile-01.svg';
    }

    public static function deleteStoredFile(?string $path): void
    {
        if ($path === null || $path === '' || self::isPreset($path)) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
