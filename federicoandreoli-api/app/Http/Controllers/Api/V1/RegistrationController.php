<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Http\Requests\RegisterProfessionalRequest;
use App\Http\Requests\RegisterSeekerRequest;
use App\Mail\Registration\WelcomeProfessionalMail;
use App\Mail\Registration\WelcomeSeekerMail;
use App\Models\ConsentRecord;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class RegistrationController
{
    public function professional(RegisterProfessionalRequest $request): JsonResponse
    {
        $data = $request->validated();

        $name = trim($data['firstName'].' '.($data['lastName'] ?? ''));

        $user = DB::transaction(function () use ($data, $name) {
            $user = User::query()->create([
                'name' => $name,
                'email' => strtolower(trim($data['email'])),
                'role' => UserRole::Professional,
                'password' => null,
            ]);

            $this->recordConsents($user, $data['consents']);

            Registration::query()->create([
                'user_id' => $user->id,
                'intent' => 'offer',
                'payload' => $data['payload'] ?? [],
            ]);

            return $user;
        });

        Mail::to($user->email)->send(new WelcomeProfessionalMail($user->name, $this->verificationUrl($user)));

        return response()->json([
            'id' => (string) $user->id,
            'intent' => 'offer',
            'emailVerificationRequired' => true,
            'message' => 'Registrazione professionista ricevuta. Completa il profilo dopo l’accesso.',
        ], 201);
    }

    public function seeker(RegisterSeekerRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::query()->create([
                'name' => trim($data['fullName']),
                'email' => strtolower(trim($data['email'])),
                'role' => UserRole::PublicUser,
                'password' => null,
            ]);

            $this->recordConsents($user, $data['consents']);

            Registration::query()->create([
                'user_id' => $user->id,
                'intent' => 'seeker',
                'payload' => $data['payload'] ?? [],
            ]);

            return $user;
        });

        Mail::to($user->email)->send(new WelcomeSeekerMail($user->name));

        return response()->json([
            'id' => (string) $user->id,
            'intent' => 'seeker',
            'emailVerificationRequired' => false,
            'message' => 'Account famiglia creato. Puoi pubblicare una richiesta dalla dashboard.',
        ], 201);
    }

    /**
     * @param  array<string, mixed>  $consents
     */
    private function recordConsents(User $user, array $consents): void
    {
        ConsentRecord::query()->create([
            'user_id' => $user->id,
            'termini' => (bool) $consents['termini'],
            'privacy' => (bool) $consents['privacy'],
            'maggiorenne' => (bool) $consents['maggiorenne'],
            'comunicazioni' => (bool) ($consents['comunicazioni'] ?? false),
            'profilazione' => (bool) ($consents['profilazione'] ?? false),
            'version' => ConsentRecord::POLICY_VERSION,
            'source' => 'registration',
        ]);
    }

    private function verificationUrl(User $user): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addDays(7),
            ['id' => $user->id, 'hash' => sha1($user->email)],
        );
    }
}
