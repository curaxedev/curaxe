<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Application
 */
class ApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'targetType' => $this->target_type,
            'targetId' => (string) $this->target_id,
            'ownerId' => (string) $this->owner_id,
            'applicantId' => (string) $this->applicant_id,
            'applicantName' => $this->applicant_name,
            'applicantInitials' => $this->applicant_initials,
            'applicantCategory' => $this->applicant_category,
            'applicantZone' => $this->applicant_zone,
            'applicantStars' => (float) $this->applicant_stars,
            'applicantPreview' => $this->applicant_preview,
            'targetTitle' => $this->target_title,
            'targetPublisherName' => $this->target_publisher_name,
            'targetPublisherKind' => $this->target_publisher_kind,
            'status' => $this->status,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Shape ridotta per candidature lato famiglia (`FamilyApplication`).
     *
     * @return array<string, mixed>
     */
    public function toFamilyApplication(): array
    {
        $statusMap = [
            'submitted' => 'new',
            'viewed' => 'contacted',
            'shortlisted' => 'contacted',
            'interview' => 'contacted',
            'offer' => 'contacted',
            'accepted' => 'in-selection',
            'hired' => 'in-selection',
            'discarded' => 'discarded',
            'rejected' => 'discarded',
            'withdrawn' => 'discarded',
        ];

        return [
            'id' => (string) $this->id,
            'requestId' => (string) $this->target_id,
            'familyUserId' => (string) $this->owner_id,
            'professionalId' => (string) $this->applicant_id,
            'name' => $this->applicant_name,
            'initials' => $this->applicant_initials,
            'category' => $this->applicant_category,
            'zone' => $this->applicant_zone,
            'stars' => (float) $this->applicant_stars,
            'preview' => $this->applicant_preview,
            'status' => $statusMap[$this->status] ?? 'new',
        ];
    }
}
