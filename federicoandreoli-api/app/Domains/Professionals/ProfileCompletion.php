<?php

namespace App\Domains\Professionals;

use App\Models\ProfessionalProfile;

/**
 * Calcolo server-side della percentuale di completamento profilo.
 * Pesi e criteri allineati a COMPLETION_ITEMS del frontend
 * (`federicoandreoli-web/src/services/professionalProfileService.ts`).
 */
final class ProfileCompletion
{
    /**
     * @return array{percent: int, missing: list<string>}
     */
    public function evaluate(ProfessionalProfile $profile): array
    {
        $items = $this->items($profile);

        $totalWeight = 0;
        $earned = 0;
        $missing = [];

        foreach ($items as $item) {
            $totalWeight += $item['weight'];
            if ($item['ok']) {
                $earned += $item['weight'];
            } else {
                $missing[] = $item['label'];
            }
        }

        return [
            'percent' => (int) round(($earned / $totalWeight) * 100),
            'missing' => $missing,
        ];
    }

    /**
     * @return list<array{label: string, weight: int, ok: bool}>
     */
    private function items(ProfessionalProfile $profile): array
    {
        return [
            ['label' => 'Foto profilo', 'weight' => 15, 'ok' => $profile->photo_path !== null],
            ['label' => 'Bio / presentazione', 'weight' => 10, 'ok' => mb_strlen(trim((string) $profile->bio)) >= 20],
            ['label' => 'Titolo professionale', 'weight' => 8, 'ok' => mb_strlen(trim($profile->professional_title)) >= 5],
            ['label' => 'Categoria e esperienza', 'weight' => 10, 'ok' => $profile->category !== '' && $profile->experience_years !== ''],
            ['label' => 'Specializzazioni', 'weight' => 10, 'ok' => count($profile->specializations ?? []) > 0],
            ['label' => 'Lingue parlate', 'weight' => 7, 'ok' => count($profile->languages ?? []) > 0],
            ['label' => 'Disponibilità aggiornata', 'weight' => 12, 'ok' => count($profile->employment_types ?? []) > 0 && count($profile->days ?? []) >= 3],
            ['label' => 'Tariffa oraria', 'weight' => 10, 'ok' => $profile->hourly_rate >= 8],
            ['label' => 'Tariffa convivente', 'weight' => 8, 'ok' => $profile->monthly_live_in_rate >= 800],
            ['label' => 'Zone di lavoro', 'weight' => 10, 'ok' => count($profile->zones ?? []) > 0 || trim($profile->primary_zone) !== ''],
        ];
    }
}
