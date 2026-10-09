<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the Walang Brownout Appliances database.
     *
     * Run order matters — FK constraints require:
     *   1. Users          (no dependencies)
     *   2. Products       (creates product + inventory rows)
     *   3. Batches        (depends on products + updates inventory QOH)
     */
    public function run(): void
    {
        $this->command->info('');
        $this->command->info('🔌 Walang Brownout Appliances — Seeding database...');
        $this->command->info('');

        $this->call([
            UserSeeder::class,
            ProductSeeder::class,
            BatchSeeder::class,
        ]);

        $this->command->info('');
        $this->command->info('✅ Database seeded successfully.');
        $this->command->info('');
        $this->command->info('  Test credentials:');
        $this->command->info('    Admin  → admin@walangbrownout.com  / Admin@WB2026!');
        $this->command->info('    Staff  → staff@walangbrownout.com  / Staff@WB2026!');
        $this->command->info('    Team   → {name}@walangbrownout.com / WB@Pnc2026!');
        $this->command->info('');
        $this->command->info('  FIFO test: CARBON-2026-001 in RACK-C-01 expires in ~30 days.');
        $this->command->info('             Scanning CARBON-2026-002 should return FIFO_VIOLATION.');
    }
}
