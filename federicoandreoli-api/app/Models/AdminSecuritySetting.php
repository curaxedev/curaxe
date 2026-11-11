<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'security_total_enabled',
    'security_total_enabled_at',
    'login_alerts_enabled',
    'login_alert_emails',
    'password_login_enabled',
    'recovery_codes_generated_at',
])]
class AdminSecuritySetting extends Model
{
    protected function casts(): array
    {
        return [
            'security_total_enabled' => 'boolean',
            'security_total_enabled_at' => 'datetime',
            'login_alerts_enabled' => 'boolean',
            'login_alert_emails' => 'array',
            'password_login_enabled' => 'boolean',
            'recovery_codes_generated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function forUser(User $user): self
    {
        return self::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'security_total_enabled' => false,
                'login_alerts_enabled' => false,
                'login_alert_emails' => [],
                'password_login_enabled' => true,
            ],
        );
    }

    /** @return list<string> */
    public function alertEmails(): array
    {
        $emails = $this->login_alert_emails;
        if (! is_array($emails)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn ($e) => strtolower(trim((string) $e)),
            $emails,
        ), static fn ($e) => $e !== '' && filter_var($e, FILTER_VALIDATE_EMAIL))));
    }
}
