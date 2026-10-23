<?php

namespace App\Console\Commands;

use App\Models\ProfessionalProfile;
use App\Support\DirectoryCache;
use App\Support\ProfileGeoSync;
use Illuminate\Console\Command;

/**
 * Riallinea lat/lng/istat e azzera zone testuali non risolvibili.
 * Uso server: php artisan profiles:sync-geo
 */
class SyncProfessionalProfileGeoCommand extends Command
{
    protected $signature = 'profiles:sync-geo {--dry-run : Mostra conteggi senza salvare}';

    protected $description = 'Georeferenzia le zone operative ISTAT e rimuove indirizzi/testi non matchati';

    public function handle(ProfileGeoSync $sync): int
    {
        $dry = (bool) $this->option('dry-run');
        $synced = 0;
        $cleared = 0;
        $unchanged = 0;

        ProfessionalProfile::query()
            ->orderBy('id')
            ->chunkById(100, function ($profiles) use ($sync, $dry, &$synced, &$cleared, &$unchanged) {
                foreach ($profiles as $profile) {
                    $before = [
                        'primary_zone' => (string) $profile->primary_zone,
                        'istat' => (string) $profile->istat,
                        'lat' => $profile->lat,
                        'lng' => $profile->lng,
                    ];

                    $hasZone = trim($before['primary_zone']) !== ''
                        || trim((string) $profile->comune) !== ''
                        || trim($before['istat']) !== '';

                    if (! $hasZone) {
                        if ($profile->lat !== null || $profile->lng !== null) {
                            $sync->clearZone($profile);
                            if (! $dry) {
                                $profile->saveQuietly();
                            }
                            $cleared++;
                        } else {
                            $unchanged++;
                        }

                        continue;
                    }

                    $ok = $sync->sync($profile);
                    if (! $ok) {
                        if (! $dry) {
                            $profile->saveQuietly();
                        }
                        $cleared++;
                        $this->line("cleared #{$profile->id}: {$before['primary_zone']}");

                        continue;
                    }

                    $changed = (string) $profile->primary_zone !== $before['primary_zone']
                        || (string) $profile->istat !== $before['istat']
                        || $profile->lat != $before['lat']
                        || $profile->lng != $before['lng'];

                    if ($changed) {
                        if (! $dry) {
                            $profile->saveQuietly();
                        }
                        $synced++;
                    } else {
                        $unchanged++;
                    }
                }
            });

        if (! $dry) {
            DirectoryCache::bump();
        }

        $this->info(($dry ? '[dry-run] ' : '')."synced={$synced} cleared={$cleared} unchanged={$unchanged}");

        return self::SUCCESS;
    }
}
