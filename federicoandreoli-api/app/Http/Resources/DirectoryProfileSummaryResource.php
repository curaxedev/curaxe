<?php

namespace App\Http\Resources;

use App\Models\Organization;
use App\Models\ProfessionalProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Shape allineata a `DirectoryProfileSummary` del frontend.
 *
 * @mixin ProfessionalProfile|Organization
 */
class DirectoryProfileSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        if ($this->resource instanceof Organization) {
            return [
                'id' => 'org-'.$this->id,
                'listingIntent' => 'cerco',
                'category' => $this->kind === 'agency' ? 'agency' : 'facility',
                'type' => 'facility',
                'name' => $this->name,
                'role' => $this->role_label,
                'stars' => (float) $this->rating_avg,
                'locationLabel' => $this->location_label !== '' ? $this->location_label : $this->comune,
                'location' => true,
                'online' => $this->is_online,
                'shift' => $this->shift,
                'imageUrl' => $this->image_url ?? '/images/profiles/profile-facility.svg',
                'match' => [
                    'istat' => $this->istat,
                    'comune' => $this->comune,
                    'cap' => $this->cap,
                    'regione' => $this->regione,
                ],
            ];
        }

        /** @var ProfessionalProfile $profile */
        $profile = $this->resource;
        $category = self::mapCategory($profile->category);
        $name = trim($profile->first_name.' '.$profile->last_name);

        return [
            'id' => (string) $profile->user_id,
            'listingIntent' => 'cerco',
            'category' => $category,
            'type' => 'professional',
            'name' => $name !== '' ? $name : ($profile->user?->name ?? 'Professionista'),
            'role' => $profile->professional_title !== '' ? $profile->professional_title : $profile->category,
            'stars' => (float) $profile->rating_avg,
            'locationLabel' => $profile->primary_zone !== '' ? $profile->primary_zone : $profile->comune,
            'location' => true,
            'online' => $profile->is_online,
            'shift' => is_array($profile->shifts) && $profile->shifts !== [] ? (string) $profile->shifts[0] : null,
            'imageUrl' => $profile->photo_path !== null
                ? Storage::disk('public')->url($profile->photo_path)
                : '/images/profiles/profile-placeholder.svg',
            'match' => [
                'istat' => $profile->istat,
                'comune' => $profile->comune,
                'cap' => $profile->cap,
                'regione' => $profile->regione,
            ],
            'verified' => $profile->is_verified,
        ];
    }

    public static function mapCategory(string $category): string
    {
        $normalized = strtolower(trim($category));

        return match (true) {
            str_contains($normalized, 'infermier') || $normalized === 'nurse' => 'nurse',
            str_contains($normalized, 'oss') => 'oss',
            str_contains($normalized, 'assistent') => 'assistant',
            default => 'caregiver',
        };
    }
}
