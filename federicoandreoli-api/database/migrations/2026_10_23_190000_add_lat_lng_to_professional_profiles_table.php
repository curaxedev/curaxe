<?php

use App\Models\ProfessionalProfile;
use App\Support\DirectoryCache;
use App\Support\ProfileGeoSync;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('professional_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('professional_profiles', 'lat')) {
                $table->decimal('lat', 10, 7)->nullable()->after('istat');
            }
            if (! Schema::hasColumn('professional_profiles', 'lng')) {
                $table->decimal('lng', 10, 7)->nullable()->after('lat');
            }
        });

        try {
            Schema::table('professional_profiles', function (Blueprint $table) {
                $table->index(['is_published', 'lat', 'lng'], 'professional_profiles_published_lat_lng_index');
            });
        } catch (\Throwable) {
            // already present
        }

        $sync = new ProfileGeoSync;
        $cleared = 0;
        $synced = 0;

        ProfessionalProfile::query()
            ->orderBy('id')
            ->chunkById(100, function ($profiles) use ($sync, &$cleared, &$synced) {
                foreach ($profiles as $profile) {
                    $hasZone = trim((string) $profile->primary_zone) !== ''
                        || trim((string) $profile->comune) !== ''
                        || trim((string) $profile->istat) !== '';

                    if (! $hasZone) {
                        if ($profile->lat !== null || $profile->lng !== null) {
                            $sync->clearZone($profile);
                            $profile->saveQuietly();
                            $cleared++;
                        }

                        continue;
                    }

                    if ($sync->sync($profile)) {
                        $synced++;
                    } else {
                        // Testo libero / indirizzo non ISTAT → zona azzerata
                        $cleared++;
                    }

                    if ($profile->isDirty()) {
                        $profile->saveQuietly();
                    }
                }
            });

        DirectoryCache::bump();
    }

    public function down(): void
    {
        Schema::table('professional_profiles', function (Blueprint $table) {
            try {
                $table->dropIndex('professional_profiles_published_lat_lng_index');
            } catch (\Throwable) {
                // ignore
            }
            if (Schema::hasColumn('professional_profiles', 'lat')) {
                $table->dropColumn(['lat', 'lng']);
            }
        });
    }
};
