<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shape allineata a `MockOpenPosition` del frontend.
 *
 * @mixin \App\Models\JobPosting
 */
class DirectoryOpenPositionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'category' => $this->category,
            'posterType' => $this->poster_type,
            'posterDisplayName' => $this->poster_display_name,
            'contractBucket' => $this->contract_bucket,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'locationLabel' => $this->location_label,
            'rateLabel' => $this->rate_label,
            'scheduleLabel' => $this->schedule_label,
            'urgency' => $this->urgency,
            'badge' => $this->badge,
            'descriptionIntro' => (string) ($this->description_intro ?? ''),
            'duties' => $this->duties ?? [],
            'requirements' => $this->requirements ?? [],
            'mobility' => $this->mobility,
        ];
    }
}
