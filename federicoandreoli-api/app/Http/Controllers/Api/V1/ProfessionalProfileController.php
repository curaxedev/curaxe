<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ProfessionalProfileResource;
use App\Models\ProfessionalProfile;
use App\Models\ProfessionalProfileView;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfessionalProfileController
{
    public function show(Request $request): JsonResponse
    {
        return (new ProfessionalProfileResource($this->profileFor($request->user())))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Metriche home dashboard professionista (visualizzazioni profilo).
     */
    public function stats(Request $request): JsonResponse
    {
        $profile = ProfessionalProfile::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if ($profile === null) {
            return response()->json([
                'profileViewsTotal' => 0,
                'profileViewsLast7Days' => 0,
                'profileViewsPrevious7Days' => 0,
                'weekChangePercent' => null,
            ]);
        }

        $total = ProfessionalProfileView::query()
            ->where('professional_profile_id', $profile->id)
            ->count();

        $last7Start = now()->subDays(6)->startOfDay();
        $prev7Start = now()->subDays(13)->startOfDay();
        $prev7End = now()->subDays(7)->endOfDay();

        $last7 = ProfessionalProfileView::query()
            ->where('professional_profile_id', $profile->id)
            ->whereDate('viewed_on', '>=', $last7Start->toDateString())
            ->count();

        $prev7 = ProfessionalProfileView::query()
            ->where('professional_profile_id', $profile->id)
            ->whereDate('viewed_on', '>=', $prev7Start->toDateString())
            ->whereDate('viewed_on', '<=', $prev7End->toDateString())
            ->count();

        $weekChangePercent = null;
        if ($prev7 > 0) {
            $weekChangePercent = (int) round((($last7 - $prev7) / $prev7) * 100);
        } elseif ($last7 > 0) {
            $weekChangePercent = 100;
        }

        return response()->json([
            'profileViewsTotal' => $total,
            'profileViewsLast7Days' => $last7,
            'profileViewsPrevious7Days' => $prev7,
            'weekChangePercent' => $weekChangePercent,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identity' => ['nullable', 'array'],
            'identity.firstName' => ['nullable', 'string', 'max:100'],
            'identity.lastName' => ['nullable', 'string', 'max:100'],
            'identity.professionalTitle' => ['nullable', 'string', 'max:255'],
            'identity.birthYear' => ['nullable', 'integer', 'min:1920', 'max:2010'],
            'identity.nationality' => ['nullable', 'string', 'max:100'],
            'identity.bio' => ['nullable', 'string', 'max:2000'],
            'professional' => ['nullable', 'array'],
            'professional.category' => ['nullable', 'string', 'max:100'],
            'professional.experienceYears' => ['nullable', 'string', 'max:50'],
            'professional.specializations' => ['nullable', 'array'],
            'professional.specializations.*' => ['string', 'max:100'],
            'professional.languages' => ['nullable', 'array'],
            'professional.languages.*' => ['string', 'max:50'],
            'professional.hasLicense' => ['nullable', 'boolean'],
            'professional.hasCar' => ['nullable', 'boolean'],
            'availability' => ['nullable', 'array'],
            'availability.employmentTypes' => ['nullable', 'array'],
            'availability.employmentTypes.*' => ['string', 'max:50'],
            'availability.days' => ['nullable', 'array'],
            'availability.days.*' => ['string', 'max:20'],
            'availability.shifts' => ['nullable', 'array'],
            'availability.shifts.*' => ['string', 'max:50'],
            'availability.availableFrom' => ['nullable', 'string', 'max:20'],
            'rates' => ['nullable', 'array'],
            'rates.hourly' => ['nullable', 'numeric', 'min:0', 'max:500'],
            'rates.monthlyLiveIn' => ['nullable', 'numeric', 'min:0', 'max:20000'],
            'zones' => ['nullable', 'array'],
            'zones.*' => ['string', 'max:100'],
            'primaryZone' => ['nullable', 'string', 'max:255'],
            'radiusKm' => ['nullable', 'integer', 'min:1', 'max:200'],
            'availableToMove' => ['nullable', 'boolean'],
            'certifications' => ['nullable', 'array'],
            'certifications.*' => ['string', 'max:100'],
        ]);

        $profile = $this->profileFor($request->user());

        $map = [
            'identity.firstName' => 'first_name',
            'identity.lastName' => 'last_name',
            'identity.professionalTitle' => 'professional_title',
            'identity.birthYear' => 'birth_year',
            'identity.nationality' => 'nationality',
            'identity.bio' => 'bio',
            'professional.category' => 'category',
            'professional.experienceYears' => 'experience_years',
            'professional.specializations' => 'specializations',
            'professional.languages' => 'languages',
            'professional.hasLicense' => 'has_license',
            'professional.hasCar' => 'has_car',
            'availability.employmentTypes' => 'employment_types',
            'availability.days' => 'days',
            'availability.shifts' => 'shifts',
            'availability.availableFrom' => 'available_from',
            'rates.hourly' => 'hourly_rate',
            'rates.monthlyLiveIn' => 'monthly_live_in_rate',
            'zones' => 'zones',
            'primaryZone' => 'primary_zone',
            'radiusKm' => 'radius_km',
            'availableToMove' => 'available_to_move',
            'certifications' => 'certifications',
        ];

        foreach ($map as $inputKey => $column) {
            $value = data_get($data, $inputKey, '__missing__');
            if ($value === '__missing__') {
                continue;
            }
            // Permetti di azzerare il raggio (null); per gli altri campi resta lo skip dei null.
            if ($value === null && $column !== 'radius_km') {
                continue;
            }
            $profile->{$column} = $value;
        }

        $profile->save();

        return (new ProfessionalProfileResource($profile))
            ->response()
            ->setStatusCode(200);
    }

    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], [
            'photo.mimes' => 'Formato non supportato: usa JPG, PNG o WebP.',
            'photo.max' => 'La foto supera i 2 MB consentiti.',
        ]);

        $profile = $this->profileFor($request->user());

        if ($profile->photo_path !== null) {
            Storage::disk('public')->delete($profile->photo_path);
        }

        $path = $request->file('photo')->store('profile-photos/'.$request->user()->id, 'public');
        $profile->photo_path = $path;
        $profile->save();

        return (new ProfessionalProfileResource($profile))
            ->response()
            ->setStatusCode(200);
    }

    /** Crea il profilo al primo accesso, seedandolo dal payload di registrazione. */
    private function profileFor(User $user): ProfessionalProfile
    {
        $existing = ProfessionalProfile::query()->where('user_id', $user->id)->first();
        if ($existing !== null) {
            return $existing;
        }

        $registration = Registration::query()
            ->where('user_id', $user->id)
            ->where('intent', 'offer')
            ->latest('id')
            ->first();
        $payload = $registration?->payload ?? [];

        $nameParts = explode(' ', trim($user->name), 2);
        $extra = $payload['extra'] ?? [];

        return ProfessionalProfile::query()->create([
            'user_id' => $user->id,
            'first_name' => $payload['firstName'] ?? ($nameParts[0] ?? ''),
            'last_name' => $payload['lastName'] ?? ($nameParts[1] ?? ''),
            'birth_year' => $payload['birthYear'] ?? null,
            'category' => $this->categoryLabel($payload['role'] ?? ''),
            'experience_years' => $payload['experienceYears'] ?? '',
            'specializations' => $payload['skills'] ?? [],
            'languages' => $payload['languages'] ?? [],
            'has_license' => (bool) ($extra['hasDriverLicense'] ?? false),
            'has_car' => (bool) ($extra['hasCar'] ?? false),
            'employment_types' => [],
            'days' => $payload['availability']['days'] ?? [],
            'shifts' => [],
            'available_from' => '',
            'zones' => [],
            'primary_zone' => $payload['address']['comune'] ?? ($payload['address']['line'] ?? ''),
            'certifications' => [],
            'bio' => $payload['bio'] ?? '',
        ]);
    }

    private function categoryLabel(string $role): string
    {
        return match ($role) {
            'infermiere' => 'Infermiere',
            'oss' => 'OSS',
            'badante' => 'Badante',
            'altro' => 'Altro',
            default => '',
        };
    }
}
