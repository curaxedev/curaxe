<?php

namespace Database\Seeders;

use App\Domains\Auth\Enums\UserRole;
use App\Models\JobPosting;
use App\Models\Organization;
use App\Models\ProfessionalProfile;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Dati directory pubblici allineati alle fixture frontend (Milano / Lombardia).
 */
class DirectoryDemoSeeder extends Seeder
{
    public function run(): void
    {
        $maria = User::query()->where('email', 'maria.rossi@email.it')->first();
        if ($maria !== null) {
            ProfessionalProfile::query()->updateOrCreate(
                ['user_id' => $maria->id],
                [
                    'first_name' => 'Maria',
                    'last_name' => 'Rossi',
                    'professional_title' => 'Badante esperta — Milano e provincia',
                    'birth_year' => 1982,
                    'nationality' => 'Rumena',
                    'bio' => 'Assistente familiare con esperienza in demenze e Alzheimer. Empatica, puntuale, referenze verificabili.',
                    'category' => 'Badante',
                    'experience_years' => '6-9 anni',
                    'specializations' => ['Alzheimer/Demenze', 'Anziani autosufficienti'],
                    'languages' => ['Italiano', 'Rumeno'],
                    'has_license' => true,
                    'has_car' => false,
                    'employment_types' => ['Convivente', 'A ore'],
                    'days' => ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'],
                    'shifts' => ['Mattina 7–13', 'Pomeriggio 13–19'],
                    'available_from' => 'Immediata',
                    'hourly_rate' => 12,
                    'monthly_live_in_rate' => 1400,
                    'zones' => ['Milano', 'Sesto San Giovanni'],
                    'primary_zone' => 'Milano',
                    'available_to_move' => false,
                    'certifications' => ['Primo soccorso', 'Corso Alzheimer'],
                    'is_published' => true,
                    'is_verified' => true,
                    'is_online' => true,
                    'rating_avg' => 4.8,
                    'review_count' => 12,
                    'comune' => 'Milano',
                    'cap' => '20121',
                    'regione' => 'Lombardia',
                    'istat' => '015146',
                ],
            );
        }

        $lucia = User::query()->updateOrCreate(
            ['email' => 'lucia.verdi@email.it'],
            [
                'name' => 'Lucia Verdi',
                'role' => UserRole::Professional,
                'password' => null,
                'email_verified_at' => now(),
            ],
        );

        ProfessionalProfile::query()->updateOrCreate(
            ['user_id' => $lucia->id],
            [
                'first_name' => 'Lucia',
                'last_name' => 'Verdi',
                'professional_title' => 'OSS — assistenza domiciliare',
                'birth_year' => 1990,
                'nationality' => 'Italiana',
                'bio' => 'OSS con esperienza in RSA e domicilio. Specializzata in mobilizzazione e igiene.',
                'category' => 'OSS',
                'experience_years' => '3-5 anni',
                'specializations' => ['Mobilizzazione', 'Igiene personale'],
                'languages' => ['Italiano', 'Inglese'],
                'has_license' => true,
                'has_car' => true,
                'employment_types' => ['Part-time', 'A ore'],
                'days' => ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
                'shifts' => ['Mattina 7–13'],
                'available_from' => 'Entro 2 settimane',
                'hourly_rate' => 14,
                'monthly_live_in_rate' => 0,
                'zones' => ['Monza', 'Milano'],
                'primary_zone' => 'Monza',
                'available_to_move' => false,
                'certifications' => ['OSS certificato'],
                'is_published' => true,
                'is_verified' => false,
                'is_online' => false,
                'rating_avg' => 4.5,
                'review_count' => 6,
                'comune' => 'Monza',
                'cap' => '20900',
                'regione' => 'Lombardia',
                'istat' => '108033',
            ],
        );

        $agencyUser = User::query()->where('email', 'info@auracare.it')->first();
        $structureUser = User::query()->where('email', 'info@villaserena.it')->first();

        if ($agencyUser !== null) {
            $agency = Organization::query()->updateOrCreate(
                ['slug' => 'auracare-srl'],
                [
                    'user_id' => $agencyUser->id,
                    'kind' => 'agency',
                    'name' => 'AuraCare Srl',
                    'role_label' => 'Agenzia di assistenza domiciliare',
                    'bio' => 'Agenzia specializzata nell’assistenza domiciliare per anziani e disabili nell’area metropolitana di Milano.',
                    'coverage_hint' => 'Milano, Monza-Brianza, Sesto San Giovanni',
                    'image_url' => '/images/profiles/profile-agency.svg',
                    'rating_avg' => 4.6,
                    'review_count' => 28,
                    'is_online' => true,
                    'is_published' => true,
                    'comune' => 'Milano',
                    'cap' => '20100',
                    'regione' => 'Lombardia',
                    'istat' => '015146',
                    'location_label' => 'Milano centro',
                    'shift' => 'Selezione e formazione professionisti',
                    'services' => ['Badanti', 'OSS', 'Infermieri domiciliari'],
                    'branches' => [
                        [
                            'id' => 'auracare-main',
                            'name' => 'AuraCare — sede Milano',
                            'comune' => 'Milano',
                            'cap' => '20100',
                            'addressHint' => 'Milano centro',
                            'phoneHint' => '02 000000',
                        ],
                    ],
                ],
            );

            JobPosting::query()->updateOrCreate(
                ['user_id' => $agencyUser->id, 'title' => 'Badante convivente – Milano zona sud'],
                [
                    'organization_id' => $agency->id,
                    'status' => 'active',
                    'category' => 'caregiver',
                    'poster_type' => 'agenzia',
                    'poster_display_name' => 'AuraCare Srl · Milano',
                    'contract_bucket' => 'other',
                    'excerpt' => 'Cerchiamo badante convivente per signora con necessità di supervisione quotidiana.',
                    'location_label' => 'Milano, zona sud',
                    'comune' => 'Milano',
                    'regione' => 'Lombardia',
                    'rate_label' => '€1.500 – 1.700 / mese',
                    'schedule_label' => 'Convivenza lun–sab',
                    'urgency' => 'urgente',
                    'badge' => 'Urgente',
                    'description_intro' => 'Ambiente familiare, due adulti in casa oltre alla persona assistita.',
                    'duties' => ['Assistenza giornaliera', 'Compagnia', 'Accompagnamento visite'],
                    'requirements' => ['Esperienza demenze', 'Italiano fluente', 'Referenze'],
                    'mobility' => null,
                    'published_at' => now()->subDays(2),
                ],
            );
        }

        if ($structureUser !== null) {
            Organization::query()->updateOrCreate(
                ['slug' => 'rsa-villa-serena'],
                [
                    'user_id' => $structureUser->id,
                    'kind' => 'facility',
                    'name' => 'RSA Villa Serena',
                    'role_label' => 'Residenza sanitaria assistenziale',
                    'bio' => 'RSA con posti letto e servizi di riabilitazione. Assumiamo OSS e infermieri.',
                    'coverage_hint' => 'Sesto San Giovanni e hinterland nord Milano',
                    'image_url' => '/images/profiles/profile-facility.svg',
                    'rating_avg' => 4.4,
                    'review_count' => 19,
                    'is_online' => true,
                    'is_published' => true,
                    'comune' => 'Sesto San Giovanni',
                    'cap' => '20099',
                    'regione' => 'Lombardia',
                    'istat' => '015209',
                    'location_label' => 'Sesto San Giovanni',
                    'shift' => 'Turni H24',
                    'services' => ['RSA', 'Riabilitazione', 'Day hospital'],
                    'branches' => [
                        [
                            'id' => 'villa-main',
                            'name' => 'RSA Villa Serena',
                            'comune' => 'Sesto San Giovanni',
                            'cap' => '20099',
                            'addressHint' => 'Via della Residenza 1',
                        ],
                    ],
                ],
            );
        }
    }
}
