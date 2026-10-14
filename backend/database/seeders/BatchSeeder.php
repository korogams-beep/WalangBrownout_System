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
    | Batch Seeder — FIFO Lot Demonstration Data (Streamlined)
    |--------------------------------------------------------------------------
    | Seeds batch scenarios for perishable products in the streamlined catalog.
    | CLEAN-AC-01: 50 units with 270 days expiry.
    | FILT-HEPA-01: 0 units (demonstrates Out of Stock condition).
    */

    public function run(): void
    {
        $keepIds = ['AC-PORT-01', 'PURIF-AIR-01', 'FILT-HEPA-01', 'CLEAN-AC-01'];

        // Remove batches for any non-allowed products and for FILT-HEPA-01 (so it remains out of stock)
        Batch::whereNotIn('product_id', $keepIds)->delete();
        Batch::where('product_id', 'FILT-HEPA-01')->delete();

        $batches = [
            [
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => 'CLEAN-AC-01',
                'batch_number'      => 'CLEAN-2026-001',
                'date_received'     => now()->toDateString(),
                'expiry_date'       => now()->addDays(270)->toDateString(),
                'quantity_received' => 50,
                'quantity_remains'  => 50,
                'bin_location'      => 'RACK-C-01',
            ],
        ];

        foreach ($batches as $batchData) {
            $existing = Batch::where('batch_number', $batchData['batch_number'])->first();

            if (! $existing) {
                Batch::create($batchData);
            } else {
                $existing->update($batchData);
            }
        }

        // Ensure inventory counts match the streamlined stock levels
        Inventory::where('product_id', 'CLEAN-AC-01')->update([
            'quantity_on_hand'   => 50,
            'quantity_committed' => 0,
        ]);

        Inventory::where('product_id', 'FILT-HEPA-01')->update([
            'quantity_on_hand'   => 0,
            'quantity_committed' => 0,
        ]);

        $this->command->info('  Streamlined batches seeded for CLEAN-AC-01 (270 days expiry).');
    }
}
