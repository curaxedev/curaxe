<?php

namespace Database\Seeders;

use App\Domains\Auth\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Account demo allineati alle fixture del frontend
 * (`federicoandreoli-web/src/mocks/authFixtures.ts`).
 */
class DemoUsersSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'DemoPass123!';

    public function run(): void
    {
        $accounts = [
            ['role' => UserRole::Professional, 'name' => 'Maria Rossi', 'email' => 'maria.rossi@email.it', 'password' => null],
            ['role' => UserRole::PublicUser, 'name' => 'Famiglia Bianchi', 'email' => 'bianchi@email.it', 'password' => null],
            ['role' => UserRole::Agency, 'name' => 'AuraCare Srl', 'email' => 'info@auracare.it', 'password' => self::DEMO_PASSWORD],
            ['role' => UserRole::Structure, 'name' => 'RSA Villa Serena', 'email' => 'info@villaserena.it', 'password' => self::DEMO_PASSWORD],
            ['role' => UserRole::PlatformAdmin, 'name' => 'Admin Piattaforma', 'email' => 'admin@assistenzafacile.it', 'password' => self::DEMO_PASSWORD],
        ];

        foreach ($accounts as $account) {
            User::query()->updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'role' => $account['role'],
                    'password' => $account['password'],
                    'email_verified_at' => now(),
                ],
            );
        }
    }
}
