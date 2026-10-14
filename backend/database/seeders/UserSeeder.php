<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 4 Official System Demo Accounts
        $accounts = [
            [
                'name'     => 'Ais',
                'email'    => 'ais@walangbrownout.com',
                'password' => Hash::make('WB@Pnc2026!'),
                'role'     => 'admin',
                'active'   => true,
            ],
            [
                'name'     => 'Brent',
                'email'    => 'brent@walangbrownout.com',
                'password' => Hash::make('WB@Pnc2026!'),
                'role'     => 'manager',
                'active'   => true,
            ],
            [
                'name'     => 'Emerson',
                'email'    => 'emerson@walangbrownout.com',
                'password' => Hash::make('WB@Pnc2026!'),
                'role'     => 'staff',
                'active'   => true,
            ],
            [
                'name'     => 'Ezra',
                'email'    => 'ezra@walangbrownout.com',
                'password' => Hash::make('WB@Pnc2026!'),
                'role'     => 'staff',
                'active'   => true,
            ],
        ];

        foreach ($accounts as $acc) {
            User::updateOrCreate(
                ['email' => $acc['email']],
                $acc
            );
        }

        $this->command->info('  Users seeded: 4 demo accounts (Ais - Admin, Brent - Manager, Emerson - Staff, Ezra - Staff 2).');
    }
}
