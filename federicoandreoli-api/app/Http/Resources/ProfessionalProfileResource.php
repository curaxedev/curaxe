<?php

namespace App\Http\Resources;

use App\Domains\Professionals\ProfileCompletion;
use App\Models\ProfessionalProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Shape allineata a `ProfessionalProfile` del frontend
 * (`src/lib/professionalProfileTypes.ts`).
 *
 * @mixin ProfessionalProfile
 */
class ProfessionalProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $completion = (new ProfileCompletion)->evaluate($this->resource);

        return [
            'id' => (string) $this->user_id,
            'completionPercent' => $completion['percent'],
            'missingFields' => $completion['missing'],
            'identity' => [
                'firstName' => $this->first_name,
                'lastName' => $this->last_name,
                'professionalTitle' => $this->professional_title,
                'birthYear' => $this->birth_year ?? 0,
                'nationality' => $this->nationality,
                'bio' => (string) $this->bio,
                'photoUrl' => $this->photo_path !== null ? Storage::disk('public')->url($this->photo_path) : null,
            ],
            'professional' => [
                'category' => $this->category,
                'experienceYears' => $this->experience_years,
                'specializations' => $this->specializations ?? [],
                'languages' => $this->languages ?? [],
                'hasLicense' => $this->has_license,
                'hasCar' => $this->has_car,
            ],
            'availability' => [
                'employmentTypes' => $this->employment_types ?? [],
                'days' => $this->days ?? [],
                'shifts' => $this->shifts ?? [],
                'availableFrom' => $this->available_from,
            ],
            'rates' => [
                'hourly' => $this->hourly_rate,
                'monthlyLiveIn' => $this->monthly_live_in_rate,
            ],
            'zones' => $this->zones ?? [],
            'primaryZone' => $this->primary_zone,
            'availableToMove' => $this->available_to_move,
            'certifications' => $this->certifications ?? [],
        ];
    }
}
