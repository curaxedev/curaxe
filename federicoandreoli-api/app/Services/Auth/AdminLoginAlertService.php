<?php

namespace App\Services\Auth;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Auth\AdminLoginAlertMail;
use App\Models\AdminLoginDevice;
use App\Models\AdminSecuritySetting;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Throwable;

final class AdminLoginAlertService
{
    public function recordLogin(
        User $user,
        Request $request,
        string $method,
        string $outcome = 'success',
    ): void {
        if ($user->role !== UserRole::PlatformAdmin) {
            return;
        }

        $ua = (string) $request->userAgent();
        $acceptLang = (string) $request->header('Accept-Language', '');
        $hash = hash('sha256', strtolower(trim($ua)).'|'.strtolower(trim($acceptLang)));
        $ip = (string) $request->ip();
        $label = $this->labelFromUa($ua);
        $isNew = false;

        $device = AdminLoginDevice::query()
            ->where('user_id', $user->id)
            ->where('device_hash', $hash)
            ->first();

        if ($device === null) {
            $isNew = true;
            AdminLoginDevice::query()->create([
                'user_id' => $user->id,
                'device_hash' => $hash,
                'label' => $label,
                'user_agent' => mb_substr($ua, 0, 512),
                'last_ip' => $ip,
                'trusted' => false,
                'first_seen_at' => now(),
                'last_seen_at' => now(),
            ]);
        } else {
            $device->last_ip = $ip;
            $device->last_seen_at = now();
            $device->user_agent = mb_substr($ua, 0, 512);
            $device->label = $label;
            $device->save();
        }

        $event = match ($outcome) {
            'failed' => 'admin.login.failed',
            'blocked' => 'admin.login.blocked',
            default => $isNew ? 'admin.login.new_device' : 'admin.login.success',
        };
        AuditLog::record($user->id, $event, User::class, (string) $user->id, [
            'method' => $method,
            'outcome' => $outcome,
            'ip' => $ip,
            'new_device' => $isNew,
        ]);

        $settings = AdminSecuritySetting::forUser($user);
        if (! $settings->login_alerts_enabled) {
            return;
        }
        $emails = $settings->alertEmails();
        if ($emails === []) {
            $emails = [$user->email];
        }

        foreach ($emails as $to) {
            try {
                Mail::to($to)->send(new AdminLoginAlertMail(
                    adminName: $user->name ?: $user->email,
                    outcome: $outcome,
                    method: $method,
                    ip: $ip,
                    deviceLabel: $label,
                    userAgent: $ua,
                    isNewDevice: $isNew,
                    at: now()->timezone(config('app.timezone', 'Europe/Rome'))->format('d/m/Y H:i'),
                ));
            } catch (Throwable $e) {
                report($e);
            }
        }
    }

    public function recordFailedAttempt(?User $user, Request $request, string $method, string $reason): void
    {
        if ($user === null || $user->role !== UserRole::PlatformAdmin) {
            return;
        }

        $cacheKey = 'admin-login-fail:'.$user->id;
        $count = (int) cache()->get($cacheKey, 0) + 1;
        cache()->put($cacheKey, $count, now()->addMinutes(15));

        AuditLog::record($user->id, 'admin.login.failed', User::class, (string) $user->id, [
            'method' => $method,
            'reason' => $reason,
            'ip' => $request->ip(),
            'streak' => $count,
        ]);

        if ($count >= 3) {
            $this->recordLogin($user, $request, $method, 'failed');
            cache()->forget($cacheKey);
        }
    }

    /** @return list<array{id: string, label: string|null, lastIp: string|null, firstSeenAt: string, lastSeenAt: string, trusted: bool}> */
    public function listDevices(User $user): array
    {
        return AdminLoginDevice::query()
            ->where('user_id', $user->id)
            ->orderByDesc('last_seen_at')
            ->limit(20)
            ->get()
            ->map(fn (AdminLoginDevice $d) => [
                'id' => (string) $d->id,
                'label' => $d->label,
                'lastIp' => $d->last_ip,
                'firstSeenAt' => $d->first_seen_at?->toIso8601String() ?? '',
                'lastSeenAt' => $d->last_seen_at?->toIso8601String() ?? '',
                'trusted' => $d->trusted,
            ])
            ->all();
    }

    private function labelFromUa(string $ua): string
    {
        $browser = 'Browser';
        if (str_contains($ua, 'Edg/')) {
            $browser = 'Edge';
        } elseif (str_contains($ua, 'Chrome/')) {
            $browser = 'Chrome';
        } elseif (str_contains($ua, 'Firefox/')) {
            $browser = 'Firefox';
        } elseif (str_contains($ua, 'Safari/') && ! str_contains($ua, 'Chrome/')) {
            $browser = 'Safari';
        }

        $os = 'dispositivo';
        if (str_contains($ua, 'Mac OS')) {
            $os = 'macOS';
        } elseif (str_contains($ua, 'Windows')) {
            $os = 'Windows';
        } elseif (str_contains($ua, 'Android')) {
            $os = 'Android';
        } elseif (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) {
            $os = 'iOS';
        } elseif (str_contains($ua, 'Linux')) {
            $os = 'Linux';
        }

        return "{$browser} su {$os}";
    }
}
