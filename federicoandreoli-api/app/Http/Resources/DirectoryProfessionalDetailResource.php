<?php

namespace App\Http\Resources;

use App\Models\ProfessionalProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Shape allineata a `DirectoryProfessionalDetail` / `MockProfile` del frontend.
 *
 * @mixin ProfessionalProfile
 */
class DirectoryProfessionalDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $summary = (new DirectoryProfileSummaryResource($this->resource))->toArray($request);
        $specializations = $this->specializations ?? [];
        $weekdays = [true, true, true, true, true, false, false];
        $none = [false, false, false, false, false, false, false];

        $competences = array_map(
            fn (string $label, int $i) => [
                'id' => 'spec-'.$i,
                'label' => $label,
                'iconKey' => 'heart',
            ],
            $specializations,
            array_keys($specializations),
        );

        if ($competences === []) {
            $competences = [
                ['id' => 'cura', 'label' => 'Cura della persona', 'iconKey' => 'heart'],
            ];
        }

        return array_merge($summary, [
            'age' => $this->birth_year ? (int) date('Y') - (int) $this->birth_year : null,
            'reviewCount' => (int) $this->review_count,
            'rateLabel' => $this->hourly_rate > 0 ? '€'.number_format((float) $this->hourly_rate, 0).'/ora' : null,
            'experienceLabel' => $this->experience_years !== '' ? $this->experience_years : null,
            'bio' => (string) ($this->bio ?: 'Professionista del settore socio-sanitario.'),
            'bioMore' => null,
            'traits' => array_slice($this->languages ?? ['Italiano'], 0, 3),
            'competences' => $competences,
            'experiences' => array_map(
                fn (string $label) => [
                    'ageOrPatient' => $label,
                    'yearsLabel' => $this->experience_years !== '' ? $this->experience_years : 'Esperienza',
                    'iconKey' => 'senior',
                ],
                array_slice($specializations !== [] ? $specializations : ['Assistenza domiciliare'], 0, 3),
            ),
            'servicesCanDo' => $this->employment_types ?? [],
            'servicesCanHelpWith' => array_map(
                fn (string $label) => ['label' => $label, 'iconKey' => 'home'],
                array_slice($specializations, 0, 4),
            ),
            'availability' => [
                'morning' => $weekdays,
                'afternoon' => $weekdays,
                'evening' => $none,
            ],
            'availableFor' => $this->employment_types ?? [],
            'references' => [],
            'coverageHint' => $this->primary_zone !== ''
                ? 'Copertura: '.$this->primary_zone
                : 'Zona da concordare',
            'verified' => (bool) $this->is_verified,
        ]);
    }
}
