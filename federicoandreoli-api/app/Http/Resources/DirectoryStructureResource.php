<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shape allineata a `StructureDetail` del frontend.
 *
 * @mixin \App\Models\Organization
 */
class DirectoryStructureResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => 'org-'.$this->id,
            'kind' => $this->kind === 'agency' ? 'agency' : 'facility',
            'listingIntent' => 'cerco',
            'name' => $this->name,
            'role' => $this->role_label,
            'stars' => (float) $this->rating_avg,
            'reviewCount' => (int) $this->review_count,
            'locationLabel' => $this->location_label !== '' ? $this->location_label : $this->comune,
            'online' => $this->is_online,
            'imageUrl' => $this->image_url ?? '/images/profiles/profile-facility.svg',
            'shift' => $this->shift,
            'bio' => (string) ($this->bio ?? ''),
            'coverageHint' => $this->coverage_hint,
            'match' => [
                'istat' => $this->istat,
                'comune' => $this->comune,
                'cap' => $this->cap,
                'regione' => $this->regione,
            ],
            'branches' => $this->branches ?? [],
            'services' => $this->services ?? [],
        ];
    }
}
