<?php

namespace App\Http\Resources;

use App\Domains\Professionals\ProfileCompletion;
use App\Models\ProfessionalProfile;
use App\Support\ProfilePhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Schema;

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
                'birthYear' => $this->birth_year ? (int) $this->birth_year : null,
                'nationality' => $this->nationality !== '' ? $this->nationality : null,
                'phone' => Schema::hasColumn('professional_profiles', 'phone') ? $this->phone : null,
                'bio' => (string) $this->bio,
                'photoUrl' => ProfilePhoto::publicUrl($this->photo_path),
                'avatarPresetId' => ProfilePhoto::presetIdFromPath($this->photo_path),
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
            'primaryIstat' => ($this->istat !== null && $this->istat !== '') ? $this->istat : null,
            'radiusKm' => $this->radius_km,
            'availableToMove' => $this->available_to_move,
            'certifications' => $this->certifications ?? [],
        ];
    }
}
