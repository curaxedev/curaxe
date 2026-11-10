<?php

namespace Database\Seeders;

use App\Domains\Auth\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Account demo allineati alle fixture del frontend
 * (`federicoandreoli-web/src/mocks/authFixtures.ts`).
 *
 * Bloccato in production. Password da DEMO_PASSWORD (mai hardcodare in prod).
 */
class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('DemoUsersSeeder rifiutato in production.');
        }

        $demoPassword = env('DEMO_PASSWORD');
        if (! is_string($demoPassword) || $demoPassword === '') {
            if (app()->environment(['local', 'testing'])) {
                $demoPassword = 'DemoPass123!';
            } else {
                throw new RuntimeException('Imposta DEMO_PASSWORD per eseguire DemoUsersSeeder.');
            }
        }

        $accounts = [
            ['role' => UserRole::Professional, 'name' => 'Maria Rossi', 'email' => 'maria.rossi@email.it', 'password' => null],
            ['role' => UserRole::PublicUser, 'name' => 'Famiglia Bianchi', 'email' => 'bianchi@email.it', 'password' => null],
            ['role' => UserRole::Agency, 'name' => 'AuraCare Srl', 'email' => 'info@auracare.it', 'password' => $demoPassword],
            ['role' => UserRole::Structure, 'name' => 'RSA Villa Serena', 'email' => 'info@villaserena.it', 'password' => $demoPassword],
            ['role' => UserRole::PlatformAdmin, 'name' => 'Admin Piattaforma', 'email' => 'admin@assistenzafacile.it', 'password' => $demoPassword],
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
