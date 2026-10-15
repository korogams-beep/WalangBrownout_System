<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'id'             => 'SUP-001',
                'name'           => 'CoolAire Distributors',
                'contact_person' => 'Juan dela Cruz',
                'phone'          => '09171234567',
                'email'          => 'juan@coolairedist.com',
                'address'        => 'Quezon City, Metro Manila',
            ],
            [
                'id'             => 'SUP-002',
                'name'           => 'PureBreeze Supply Co.',
                'contact_person' => 'Maria Santos',
                'phone'          => '09281234567',
                'email'          => 'maria@purebreeze.ph',
                'address'        => 'Cebu City, Cebu',
            ],
        ];

        foreach ($suppliers as $s) {
            Supplier::updateOrCreate(
                ['id' => $s['id']],
                $s
            );
        }

        $this->command->info('  Suppliers seeded: CoolAire Distributors (SUP-001), PureBreeze Supply Co. (SUP-002).');
    }
}
