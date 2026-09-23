<?php

namespace App\Http\Controllers\Api\V1;

use App\Mail\Registration\AccountDeletedMail;
use App\Models\ConsentRecord;
use App\Models\Registration;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class GdprController
{
    /** Ultimo registro consensi dell'utente autenticato (null se assente). */
    public function showConsents(Request $request): JsonResponse
    {
        $record = ConsentRecord::latestForUser($request->user()->id);

        return response()->json($record !== null ? $this->consentPayload($record) : null);
    }

    /**
     * Aggiorna i consensi opzionali. Append-only: crea un nuovo record
     * versionato invece di sovrascrivere quello precedente.
     */
    public function updateConsents(Request $request): JsonResponse
    {
        $data = $request->validate([
            'comunicazioni' => ['nullable', 'boolean'],
            'profilazione' => ['nullable', 'boolean'],
        ]);

        $current = ConsentRecord::latestForUser($request->user()->id);
        if ($current === null) {
            return ApiResponse::error(
                'Nessun registro consensi trovato per questo account.',
                422,
                [],
                'not_found',
            );
        }

        $record = ConsentRecord::query()->create([
            'user_id' => $request->user()->id,
            'termini' => $current->termini,
            'privacy' => $current->privacy,
            'maggiorenne' => $current->maggiorenne,
            'comunicazioni' => $data['comunicazioni'] ?? $current->comunicazioni,
            'profilazione' => $data['profilazione'] ?? $current->profilazione,
            'version' => ConsentRecord::POLICY_VERSION,
            'source' => 'settings',
        ]);

        return response()->json($this->consentPayload($record));
    }

    /** Export dati (GDPR art. 20): tutte le informazioni server-side dell'utente. */
    public function export(Request $request): JsonResponse
    {
        $user = $request->user();
        $consent = ConsentRecord::latestForUser($user->id);
        $registration = Registration::query()->where('user_id', $user->id)->latest('id')->first();

        return response()->json([
            'exportedAt' => now()->toIso8601String(),
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'emailVerifiedAt' => $user->email_verified_at?->toIso8601String(),
                'createdAt' => $user->created_at?->toIso8601String(),
            ],
            'consents' => $consent !== null ? $this->consentPayload($consent) : null,
            'consentHistory' => ConsentRecord::query()
                ->where('user_id', $user->id)
                ->orderBy('id')
                ->get()
                ->map(fn (ConsentRecord $record) => $this->consentPayload($record)),
            'registration' => $registration !== null ? [
                'intent' => $registration->intent,
                'payload' => $registration->payload,
                'createdAt' => $registration->created_at?->toIso8601String(),
            ] : null,
        ]);
    }

    /** Cancellazione account (GDPR art. 17): irreversibile, revoca sessioni, email di conferma. */
    public function destroyAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'confirm_email' => ['required', 'email:rfc'],
        ]);

        $user = $request->user();

        if (strtolower(trim($data['confirm_email'])) !== strtolower($user->email)) {
            return ApiResponse::error(
                'L’email di conferma non corrisponde all’account.',
                422,
                ['confirm_email' => ['L’email di conferma non corrisponde all’account.']],
                'validation',
            );
        }

        $email = $user->email;
        $name = $user->name;

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            // consent_records e registrations cadono in cascata (FK cascadeOnDelete).
            $user->delete();
        });

        Mail::to($email)->send(new AccountDeletedMail($name));

        return ApiResponse::noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function consentPayload(ConsentRecord $record): array
    {
        return [
            'termini' => $record->termini,
            'privacy' => $record->privacy,
            'maggiorenne' => $record->maggiorenne,
            'comunicazioni' => $record->comunicazioni,
            'profilazione' => $record->profilazione,
            'version' => $record->version,
            'recordedAt' => $record->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'source' => $record->source,
        ];
    }
}
