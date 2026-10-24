<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AdminSecuritySetting;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\WebauthnCredential;
use App\Services\Auth\AdminLoginAlertService;
use App\Services\Auth\AdminStepUpService;
use App\Support\AdminSensitiveAction;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminSecurityController
{
    public function __construct(
        private readonly AdminStepUpService $stepUp,
        private readonly AdminLoginAlertService $loginAlerts,
    ) {}

    public function settings(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $settings = AdminSecuritySetting::forUser($user);
        $passkeyCount = WebauthnCredential::query()->where('user_id', $user->id)->count();

        $rpId = (string) config('webauthn.rp_id', '');
        $origins = config('webauthn.origins', []);
        if (! is_array($origins)) {
            $origins = [];
        }

        return response()->json([
            'securityTotalEnabled' => $settings->security_total_enabled,
            'securityTotalEnabledAt' => $settings->security_total_enabled_at?->toIso8601String(),
            'loginAlertsEnabled' => $settings->login_alerts_enabled,
            'loginAlertEmails' => $settings->alertEmails(),
            'passkeyCount' => $passkeyCount,
            'canEnableSecurityTotal' => $passkeyCount >= 1,
            'sensitiveActions' => AdminSensitiveAction::labels(),
            'devices' => $this->loginAlerts->listDevices($user),
            'webauthn' => [
                'rpId' => $rpId,
                'allowedOrigins' => array_values(array_map(
                    static fn ($o) => rtrim((string) $o, '/'),
                    $origins,
                )),
                'hint' => 'RP ID deve essere curaxe.it; origini https://curaxe.it e https://www.curaxe.it. Mai api.curaxe.it.',
            ],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate([
            'securityTotalEnabled' => ['sometimes', 'boolean'],
            'loginAlertsEnabled' => ['sometimes', 'boolean'],
            'loginAlertEmails' => ['sometimes', 'array', 'max:5'],
            'loginAlertEmails.*' => ['email:rfc', 'max:120'],
        ]);

        $settings = AdminSecuritySetting::forUser($user);
        $enablingTotal = array_key_exists('securityTotalEnabled', $data)
            && (bool) $data['securityTotalEnabled']
            && ! $settings->security_total_enabled;
        $needsStepUp = $settings->security_total_enabled || $enablingTotal;

        if ($needsStepUp) {
            $token = $request->headers->get('X-Step-Up-Token');
            if (! $this->stepUp->consume($user, AdminSensitiveAction::SECURITY_SETTINGS, is_string($token) ? $token : null)) {
                return response()->json([
                    'message' => 'Conferma con passkey richiesta per questa azione.',
                    'error_code' => 'step_up_required',
                    'action' => AdminSensitiveAction::SECURITY_SETTINGS,
                ], 403);
            }
        }

        if (array_key_exists('securityTotalEnabled', $data)) {
            $want = (bool) $data['securityTotalEnabled'];
            if ($want && ! $settings->security_total_enabled) {
                if ($this->stepUp->passkeyCount($user) < 1) {
                    return ApiResponse::error(
                        'Per attivare Sicurezza totale serve almeno una passkey registrata.',
                        422,
                        [],
                        'passkey_required',
                    );
                }
                $settings->security_total_enabled = true;
                $settings->security_total_enabled_at = now();
                AuditLog::record($user->id, 'security.total.enabled', User::class, (string) $user->id);
            } elseif (! $want && $settings->security_total_enabled) {
                $settings->security_total_enabled = false;
                $settings->security_total_enabled_at = null;
                AuditLog::record($user->id, 'security.total.disabled', User::class, (string) $user->id);
            }
        }

        if (array_key_exists('loginAlertsEnabled', $data)) {
            $settings->login_alerts_enabled = (bool) $data['loginAlertsEnabled'];
        }
        if (array_key_exists('loginAlertEmails', $data)) {
            $settings->login_alert_emails = array_values(array_unique(array_map(
                static fn ($e) => strtolower(trim((string) $e)),
                $data['loginAlertEmails'],
            )));
        }

        $settings->save();

        return $this->settings($request);
    }

    public function beginStepUp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', 'max:80'],
        ]);
        try {
            $result = $this->stepUp->begin($request->user(), $data['action']);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'step_up_error');
        }

        return response()->json($result);
    }

    public function verifyStepUp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', 'max:80'],
            'challengeId' => ['required', 'string', 'max:80'],
            'credential' => ['required', 'array'],
        ]);
        try {
            $result = $this->stepUp->verify(
                $request->user(),
                $data['action'],
                $data['challengeId'],
                $data['credential'],
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'step_up_error');
        }

        return response()->json($result);
    }

    public function revokeSessions(Request $request): JsonResponse
    {
        try {
            $this->stepUp->requireIfEnabled($request, AdminSensitiveAction::SECURITY_SETTINGS);
        } catch (HttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'step_up_required',
                'action' => AdminSensitiveAction::SECURITY_SETTINGS,
            ], 403);
        }

        /** @var User $user */
        $user = $request->user();
        $current = $user->currentAccessToken();
        PersonalAccessToken::query()
            ->where('tokenable_type', User::class)
            ->where('tokenable_id', $user->id)
            ->when(
                $current instanceof PersonalAccessToken,
                fn ($q) => $q->where('id', '!=', $current->id),
            )
            ->delete();

        AuditLog::record($user->id, 'security.sessions_revoked', User::class, (string) $user->id);

        return ApiResponse::message('Altre sessioni disconnesse.');
    }
}
