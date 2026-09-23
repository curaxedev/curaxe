<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shape allineata a `AuthUser` del frontend (`src/auth/types.ts`).
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'role' => $this->role->value,
            'name' => $this->name,
            'email' => $this->email,
        ];
    }
}
