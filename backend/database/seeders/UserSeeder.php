<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin account — full access (manage products, run adjustments, delete batches)
        User::updateOrCreate(
            ['email' => 'admin@walangbrownout.com'],
            [
                'name'     => 'System Administrator',
                'email'    => 'admin@walangbrownout.com',
                'password' => Hash::make('Admin@WB2026!'),
                'role'     => 'admin',
            ]
        );

        // Staff account — daily operations (receive stock, commit orders, pick batches)
        User::updateOrCreate(
            ['email' => 'staff@walangbrownout.com'],
            [
                'name'     => 'Warehouse Staff',
                'email'    => 'staff@walangbrownout.com',
                'password' => Hash::make('Staff@WB2026!'),
                'role'     => 'staff',
            ]
        );

        // Individual team member accounts (for CCS112 demo / lab testing)
        $members = [
            ['name' => 'Facistol, Eazra Eliel R.',  'email' => 'facistol@walangbrownout.com',  'role' => 'admin'],
            ['name' => 'Gamalo, Brent Harold R.',    'email' => 'gamalo@walangbrownout.com',    'role' => 'admin'],
            ['name' => 'Guevarra, Jan Emerson C.',   'email' => 'guevarra@walangbrownout.com',  'role' => 'staff'],
            ['name' => 'Intia, Ais B.',              'email' => 'intia@walangbrownout.com',     'role' => 'staff'],
        ];

        foreach ($members as $member) {
            User::updateOrCreate(
                ['email' => $member['email']],
                [
                    'name'     => $member['name'],
                    'email'    => $member['email'],
                    'password' => Hash::make('WB@Pnc2026!'),
                    'role'     => $member['role'],
                ]
            );
        }

        $this->command->info('  Users seeded: 2 system accounts + 4 team member accounts.');
    }
}
