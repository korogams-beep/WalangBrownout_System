<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Inventory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BatchSeeder extends Seeder
{
    /*
    |--------------------------------------------------------------------------
    | Batch Seeder — FIFO Lot Demonstration Data
    |--------------------------------------------------------------------------
    | Seeds realistic multi-batch scenarios for all perishable products so
    | the FIFO picking enforcement logic can be tested end-to-end.
    |
    | Scenario for Carbon Filters (FILT-CARBON-01):
    |   Batch 001 — oldest, nearly expired  → MUST be picked first
    |   Batch 002 — mid-age                 → second in FIFO queue
    |   Batch 003 — fresh                   → last in FIFO queue
    |
    | Scenario for HEPA Filters (FILT-HEPA-01, FILT-HEPA-02):
    |   Two batches each — demonstrates multi-lot inventory tracking.
    */

    public function run(): void
    {
        $batches = [

            // ── FILT-CARBON-01: Carbon Filters — 3 FIFO lots ─────────────────
            // Batch 001: Oldest — received ~8 months ago, expires very soon
            // This batch MUST be picked first by FIFO enforcement.
            [
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => 'FILT-CARBON-01',
                'batch_number'      => 'CARBON-2026-001',
                'date_received'     => now()->subDays(240)->toDateString(),
                'expiry_date'       => now()->addDays(30)->toDateString(), // expires in 30 days!
                'quantity_received' => 50,
                'quantity_remains'  => 38,
                'bin_location'      => 'RACK-C-01',
            ],
            // Batch 002: Mid-age — received ~4 months ago
            [
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => 'FILT-CARBON-01',
                'batch_number'      => 'CARBON-2026-002',
                'date_received'     => now()->subDays(120)->toDateString(),
                'expiry_date'       => now()->addDays(150)->toDateString(),
                'quantity_received' => 60,
                'quantity_remains'  => 60,
                'bin_location'      => 'RACK-C-02',
            ],
            // Batch 003: Fresh — received last month
            [
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => 'FILT-CARBON-01',
                'batch_number'      => 'CARBON-2026-003',
                'date_received'     => now()->subDays(30)->toDateString(),
                'expiry_date'       => now()->addDays(240)->toDateString(),
                'quantity_received' => 75,
                'quantity_remains'  => 75,
                'bin_location'      => 'RACK-C-03',
            ],

            // ── FILT-HEPA-01: HEPA Filters 30sqm — 2 FIFO lots ───────────────
            [
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => 'FILT-HEPA-01',
                'batch_number'      => 'HEPA30-2026-001',
                'date_received'     => now()->subDays(90)->toDateString(),
                'expiry_date'       => now()->addDays(180)->toDateString(),
                'quantity_received' => 40,
                'quantity_remains'  => 40,
                'bin_location'      => 'RACK-H-01',
            ],
            [
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => 'FILT-HEPA-01',
                'batch_number'      => 'HEPA30-2026-002',
                'date_received'     => now()->subDays(15)->toDateString(),
                'expiry_date'       => now()->addDays(255)->toDateString(),
                'quantity_received' => 50,
                'quantity_remains'  => 50,
                'bin_location'      => 'RACK-H-02',
            ],

            // ── FILT-HEPA-02: HEPA Filters 50sqm — 2 FIFO lots ───────────────
            [
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => 'FILT-HEPA-02',
                'batch_number'      => 'HEPA50-2026-001',
                'date_received'     => now()->subDays(60)->toDateString(),
                'expiry_date'       => now()->addDays(210)->toDateString(),
                'quantity_received' => 30,
                'quantity_remains'  => 30,
                'bin_location'      => 'RACK-H-03',
            ],
            [
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => 'FILT-HEPA-02',
                'batch_number'      => 'HEPA50-2026-002',
                'date_received'     => now()->subDays(10)->toDateString(),
                'expiry_date'       => now()->addDays(260)->toDateString(),
                'quantity_received' => 25,
                'quantity_remains'  => 25,
                'bin_location'      => 'RACK-H-04',
            ],
        ];

        foreach ($batches as $batchData) {
            // Upsert by batch_number so re-seeding is idempotent
            $existing = Batch::where('batch_number', $batchData['batch_number'])->first();

            if (! $existing) {
                Batch::create($batchData);

                // Sync quantity_on_hand on the inventory row
                Inventory::where('product_id', $batchData['product_id'])
                         ->increment('quantity_on_hand', $batchData['quantity_remains']);
            }
        }

        $this->command->info('  Batches seeded: 3× Carbon Filter lots (FIFO demo), 2× HEPA-30 lots, 2× HEPA-50 lots.');
        $this->command->info('  ⚠  CARBON-2026-001 expires in ~30 days — use it to test FIFO enforcement.');
    }
}
