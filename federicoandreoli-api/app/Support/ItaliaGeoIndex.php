<?php

namespace App\Support;

/**
 * Indice ISTAT → coordinate + lookup per nome normalizzato.
 * Dati in resources/geo/istat-coords.json (no Redis, load una volta per processo).
 */
final class ItaliaGeoIndex
{
    /** @var array{byIstat: array<string, array{n: string, lat: float, lng: float}>, byName: array<string, string>}|null */
    private static ?array $data = null;

    /**
     * @return array{n: string, lat: float, lng: float, istat: string}|null
     */
    public function byIstat(string $istat): ?array
    {
        $istat = $this->normalizeIstat($istat);
        if ($istat === '') {
            return null;
        }
        $row = $this->data()['byIstat'][$istat] ?? null;
        if ($row === null) {
            return null;
        }

        return [
            'istat' => $istat,
            'n' => $row['n'],
            'lat' => (float) $row['lat'],
            'lng' => (float) $row['lng'],
        ];
    }

    /**
     * @return array{n: string, lat: float, lng: float, istat: string}|null
     */
    public function byName(string $name): ?array
    {
        $key = $this->normalizeName($name);
        if ($key === '') {
            return null;
        }
        $istat = $this->data()['byName'][$key] ?? null;
        if ($istat === null) {
            return null;
        }

        return $this->byIstat($istat);
    }

    /**
     * Risolve un luogo da istat e/o etichette (comune / primary_zone).
     *
     * @return array{n: string, lat: float, lng: float, istat: string}|null
     */
    public function resolve(?string $istat, ?string ...$labels): ?array
    {
        if ($istat !== null && trim($istat) !== '') {
            $hit = $this->byIstat($istat);
            if ($hit !== null) {
                return $hit;
            }
        }
        foreach ($labels as $label) {
            if ($label === null || trim($label) === '') {
                continue;
            }
            $hit = $this->byName($label);
            if ($hit !== null) {
                return $hit;
            }
            // "Torino (TO)" / "zona Torino" → prova il primo token significativo
            $parts = preg_split('/[\s,(\/\-]+/u', $label) ?: [];
            foreach ($parts as $part) {
                if (mb_strlen($part) < 3) {
                    continue;
                }
                $hit = $this->byName($part);
                if ($hit !== null) {
                    return $hit;
                }
            }
        }

        return null;
    }

    /**
     * Comuni entro $maxKm dal punto di ricerca (haversine).
     *
     * @return list<array{istat: string, n: string, lat: float, lng: float, km: float}>
     */
    public function withinKm(string $istatOrName, float $maxKm, int $limit = 120): array
    {
        $origin = $this->byIstat($istatOrName) ?? $this->byName($istatOrName);
        if ($origin === null) {
            return [];
        }

        $out = [];
        foreach ($this->data()['byIstat'] as $istat => $row) {
            $km = self::haversineKm(
                $origin['lat'],
                $origin['lng'],
                (float) $row['lat'],
                (float) $row['lng'],
            );
            if ($km > $maxKm) {
                continue;
            }
            $out[] = [
                'istat' => (string) $istat,
                'n' => $row['n'],
                'lat' => (float) $row['lat'],
                'lng' => (float) $row['lng'],
                'km' => round($km, 2),
            ];
        }

        usort($out, static fn ($a, $b) => $a['km'] <=> $b['km']);

        return array_slice($out, 0, max(1, $limit));
    }

    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371.0;
        $φ1 = deg2rad($lat1);
        $φ2 = deg2rad($lat2);
        $Δφ = deg2rad($lat2 - $lat1);
        $Δλ = deg2rad($lng2 - $lng1);
        $a = sin($Δφ / 2) ** 2 + cos($φ1) * cos($φ2) * sin($Δλ / 2) ** 2;

        return 2 * $earth * asin(min(1, sqrt($a)));
    }

    public function normalizeIstat(string $istat): string
    {
        $digits = preg_replace('/\D+/', '', $istat) ?? '';

        return $digits === '' ? '' : str_pad($digits, 6, '0', STR_PAD_LEFT);
    }

    public function normalizeName(string $name): string
    {
        if (class_exists(\Normalizer::class)) {
            $normalized = \Normalizer::normalize($name, \Normalizer::FORM_KD);
            if (is_string($normalized) && $normalized !== '') {
                $name = $normalized;
            }
        } elseif (function_exists('iconv')) {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name);
            if (is_string($converted) && $converted !== '') {
                $name = $converted;
            }
        }
        $name = preg_replace('/\p{Mn}+/u', '', $name) ?? $name;
        $name = mb_strtolower(trim($name));
        $name = preg_replace("/[^a-z0-9\\s']+/u", ' ', $name) ?? $name;
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;

        return trim($name);
    }

    /**
     * @return array{byIstat: array<string, array{n: string, lat: float, lng: float}>, byName: array<string, string>}
     */
    private function data(): array
    {
        if (self::$data !== null) {
            return self::$data;
        }

        $path = resource_path('geo/istat-coords.json');
        if (! is_readable($path)) {
            self::$data = ['byIstat' => [], 'byName' => []];

            return self::$data;
        }

        /** @var array{byIstat?: array<string, array{n: string, lat: float, lng: float}>, byName?: array<string, string>} $decoded */
        $decoded = json_decode((string) file_get_contents($path), true) ?: [];
        self::$data = [
            'byIstat' => $decoded['byIstat'] ?? [],
            'byName' => $decoded['byName'] ?? [],
        ];

        return self::$data;
    }
}
