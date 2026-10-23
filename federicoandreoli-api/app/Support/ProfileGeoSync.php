<?php

namespace App\Support;

use App\Models\ProfessionalProfile;

/**
 * Allinea istat/comune/lat/lng alla zona operativa.
 * Se il luogo non è un comune ISTAT risolvibile, azzera la zona (niente testo libero).
 */
final class ProfileGeoSync
{
    public function __construct(private readonly ItaliaGeoIndex $geo = new ItaliaGeoIndex) {}

    /**
     * @return bool true se la zona è georeferenziata
     */
    public function sync(ProfessionalProfile $profile, ?string $istatHint = null): bool
    {
        $hint = $istatHint !== null && trim($istatHint) !== ''
            ? $istatHint
            : (string) $profile->istat;

        $hit = $this->geo->resolve(
            $hint,
            (string) $profile->primary_zone,
            (string) $profile->comune,
        );

        if ($hit === null) {
            $this->clearZone($profile);

            return false;
        }

        $profile->istat = $hit['istat'];
        $profile->comune = $hit['n'];
        $profile->primary_zone = $hit['n'];
        $profile->lat = $hit['lat'];
        $profile->lng = $hit['lng'];

        return true;
    }

    public function clearZone(ProfessionalProfile $profile): void
    {
        $profile->primary_zone = '';
        $profile->istat = '';
        $profile->comune = '';
        $profile->lat = null;
        $profile->lng = null;
    }
}
