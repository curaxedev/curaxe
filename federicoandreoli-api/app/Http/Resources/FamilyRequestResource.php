<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\FamilyRequest
 */
class FamilyRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'familyUserId' => (string) $this->user_id,
            'title' => $this->title,
            'status' => $this->status,
            'assistanceType' => $this->assistance_type,
            'beneficiary' => $this->beneficiary,
            'employmentType' => $this->employment_type,
            'comune' => $this->comune,
            'budgetMonthly' => $this->budget_monthly,
            'days' => $this->days ?? [],
            'notes' => (string) ($this->notes ?? ''),
            'applicationCount' => (int) ($this->applications_count ?? $this->applicationCount()),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
