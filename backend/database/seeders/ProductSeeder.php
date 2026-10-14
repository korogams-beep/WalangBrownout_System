<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Transaction;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /*
    |--------------------------------------------------------------------------
    | Product Catalog — Walang Brownout Appliances (Streamlined Demo Dataset)
    |--------------------------------------------------------------------------
    | Contains the 4 core representative products across Category A, B, and C:
    |   1. AC-PORT-01   (Class A, Seasonal AC Unit)
    |   2. PURIF-AIR-01 (Class B, Air Purifier)
    |   3. FILT-HEPA-01 (Class C, HEPA Replacement Filter - Out of stock demo)
    |   4. CLEAN-AC-01  (Class C, AC Coil Cleaning Kit - 270 days shelf life)
    */

    public function run(): void
    {
        $keepIds = ['AC-PORT-01', 'PURIF-AIR-01', 'FILT-HEPA-01', 'CLEAN-AC-01'];

        // Prune any legacy or excess products and related records
        $removeIds = Product::whereNotIn('product_id', $keepIds)->pluck('product_id');
        if ($removeIds->isNotEmpty()) {
            Transaction::whereIn('product_id', $removeIds)->delete();
            Batch::whereIn('product_id', $removeIds)->delete();
            Inventory::whereIn('product_id', $removeIds)->delete();
            Product::whereIn('product_id', $removeIds)->delete();
        }

        $products = [
            // ── CLASS A: Portable AC Units (Seasonal) ────────────────────────
            [
                'product_id'              => 'AC-PORT-01',
                'name'                    => 'Portable Air Conditioner 1.0HP',
                'sku'                     => 'WB-AC-PORT-010HP',
                'abc_class'               => 'A',
                'unit_price'              => 18500.00,
                'unit_cost'               => 13200.00,
                'is_perishable'           => false,
                'is_seasonal'             => true,
                'shelf_life_days'         => null,
                'supplier_lead_time_days' => 21,
                'description'             => 'Portable 1.0HP inverter AC, no installation required. Peak demand June.',
                'initial_stock'           => 45,
                'safety_stock'            => 20,
            ],

            // ── CLASS B: Air Purifiers (Non-Seasonal) ─────────────────────────
            [
                'product_id'              => 'PURIF-AIR-01',
                'name'                    => 'HEPA Air Purifier 30sqm',
                'sku'                     => 'WB-PURIF-HEPA-30',
                'abc_class'               => 'B',
                'unit_price'              => 6799.00,
                'unit_cost'               => 4500.00,
                'is_perishable'           => false,
                'is_seasonal'             => false,
                'shelf_life_days'         => null,
                'supplier_lead_time_days' => 14,
                'description'             => 'True HEPA air purifier covering up to 30sqm. 3-stage filtration.',
                'initial_stock'           => 30,
                'safety_stock'            => 15,
            ],

            // ── CLASS C: HEPA Replacement Filters (Perishable — Out of Stock) ─
            [
                'product_id'              => 'FILT-HEPA-01',
                'name'                    => 'HEPA Replacement Filter (30sqm)',
                'sku'                     => 'WB-FILT-HEPA-30',
                'abc_class'               => 'C',
                'unit_price'              => 899.00,
                'unit_cost'               => 520.00,
                'is_perishable'           => true,
                'is_seasonal'             => false,
                'shelf_life_days'         => 270,
                'supplier_lead_time_days' => 7,
                'description'             => 'OEM HEPA replacement filter for PURIF-AIR-01. 270-day shelf life.',
                'initial_stock'           => 0,
                'safety_stock'            => 15,
            ],

            // ── CLASS C: AC Cleaning Kits (Consumable) ────────────────────────
            [
                'product_id'              => 'CLEAN-AC-01',
                'name'                    => 'AC Coil Cleaning Kit',
                'sku'                     => 'WB-CLEAN-AC-COIL',
                'abc_class'               => 'C',
                'unit_price'              => 349.00,
                'unit_cost'               => 190.00,
                'is_perishable'           => true,
                'is_seasonal'             => false,
                'shelf_life_days'         => 270,
                'supplier_lead_time_days' => 7,
                'description'             => 'AC coil cleaner spray + brushes. 270-day shelf life.',
                'initial_stock'           => 50,
                'safety_stock'            => 30,
            ],
        ];

        foreach ($products as $data) {
            $initialStock = $data['initial_stock'];
            $safetyStock  = $data['safety_stock'];

            unset($data['initial_stock'], $data['safety_stock']);

            $product = Product::updateOrCreate(
                ['product_id' => $data['product_id']],
                $data
            );

            // Upsert the inventory row alongside the product
            Inventory::updateOrCreate(
                ['product_id' => $product->product_id],
                [
                    'quantity_on_hand'   => $initialStock,
                    'quantity_committed' => 0,
                    'safety_stock'       => $safetyStock,
                ]
            );
        }

        $this->command->info('  Streamlined products seeded: 4 core representative SKUs.');
    }
}
