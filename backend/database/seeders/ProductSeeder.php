<?php

namespace Database\Seeders;

use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /*
    |--------------------------------------------------------------------------
    | Product Catalog — Walang Brownout Appliances
    |--------------------------------------------------------------------------
    | Based on the CCS112 Case Study Blueprint ABC classification:
    |
    |  CLASS A — High Value / High Demand
    |    • Portable AC Units     → Seasonal (Summer Crunch prevention)
    |    • Smart Thermostats     → Non-seasonal, steady high-value demand
    |
    |  CLASS B — Moderate Value / Moderate Demand
    |    • Air Purifiers         → Non-seasonal, steady moderate demand
    |    • Electric Fans         → Mildly seasonal, lower unit value
    |
    |  CLASS C — Low Value / Perishable / Consumable
    |    • HEPA Replacement Filters   → Perishable, 270-day shelf life
    |    • Carbon Replacement Filters → Perishable, 270-day shelf life (FIFO critical)
    |    • AC Cleaning Kits           → Non-perishable consumable
    */

    public function run(): void
    {
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
            [
                'product_id'              => 'AC-PORT-02',
                'name'                    => 'Portable Air Conditioner 1.5HP',
                'sku'                     => 'WB-AC-PORT-015HP',
                'abc_class'               => 'A',
                'unit_price'              => 24999.00,
                'unit_cost'               => 18000.00,
                'is_perishable'           => false,
                'is_seasonal'             => true,
                'shelf_life_days'         => null,
                'supplier_lead_time_days' => 21,
                'description'             => 'Portable 1.5HP inverter AC with auto-restart. Summer Crunch high-risk SKU.',
                'initial_stock'           => 30,
                'safety_stock'            => 15,
            ],

            // ── CLASS A: Smart Thermostats (Non-Seasonal) ─────────────────────
            [
                'product_id'              => 'THERM-SMART-01',
                'name'                    => 'Smart WiFi Thermostat Pro',
                'sku'                     => 'WB-THERM-WIFI-PRO',
                'abc_class'               => 'A',
                'unit_price'              => 4850.00,
                'unit_cost'               => 3100.00,
                'is_perishable'           => false,
                'is_seasonal'             => false,
                'shelf_life_days'         => null,
                'supplier_lead_time_days' => 14,
                'description'             => 'App-controlled smart thermostat, compatible with major AC brands.',
                'initial_stock'           => 80,
                'safety_stock'            => 25,
            ],
            [
                'product_id'              => 'THERM-SMART-02',
                'name'                    => 'Smart Thermostat Basic',
                'sku'                     => 'WB-THERM-BASIC',
                'abc_class'               => 'A',
                'unit_price'              => 2299.00,
                'unit_cost'               => 1450.00,
                'is_perishable'           => false,
                'is_seasonal'             => false,
                'shelf_life_days'         => null,
                'supplier_lead_time_days' => 14,
                'description'             => 'Entry-level programmable thermostat with weekly scheduling.',
                'initial_stock'           => 120,
                'safety_stock'            => 30,
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
                'initial_stock'           => 60,
                'safety_stock'            => 15,
            ],
            [
                'product_id'              => 'PURIF-AIR-02',
                'name'                    => 'HEPA Air Purifier 50sqm',
                'sku'                     => 'WB-PURIF-HEPA-50',
                'abc_class'               => 'B',
                'unit_price'              => 11500.00,
                'unit_cost'               => 7800.00,
                'is_perishable'           => false,
                'is_seasonal'             => false,
                'shelf_life_days'         => null,
                'supplier_lead_time_days' => 14,
                'description'             => 'Premium HEPA air purifier for large rooms up to 50sqm.',
                'initial_stock'           => 35,
                'safety_stock'            => 10,
            ],

            // ── CLASS B: Electric Fans ────────────────────────────────────────
            [
                'product_id'              => 'FAN-STAND-01',
                'name'                    => 'Industrial Stand Fan 18"',
                'sku'                     => 'WB-FAN-STAND-18',
                'abc_class'               => 'B',
                'unit_price'              => 2199.00,
                'unit_cost'               => 1350.00,
                'is_perishable'           => false,
                'is_seasonal'             => false,
                'shelf_life_days'         => null,
                'supplier_lead_time_days' => 10,
                'description'             => '18-inch industrial stand fan, 5-speed control, 360° rotation.',
                'initial_stock'           => 90,
                'safety_stock'            => 20,
            ],

            // ── CLASS C: HEPA Replacement Filters (Perishable) ────────────────
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
                'initial_stock'           => 0,   // stocked via BatchSeeder
                'safety_stock'            => 15,
            ],
            [
                'product_id'              => 'FILT-HEPA-02',
                'name'                    => 'HEPA Replacement Filter (50sqm)',
                'sku'                     => 'WB-FILT-HEPA-50',
                'abc_class'               => 'C',
                'unit_price'              => 1250.00,
                'unit_cost'               => 750.00,
                'is_perishable'           => true,
                'is_seasonal'             => false,
                'shelf_life_days'         => 270,
                'supplier_lead_time_days' => 7,
                'description'             => 'OEM HEPA replacement filter for PURIF-AIR-02. 270-day shelf life.',
                'initial_stock'           => 0,
                'safety_stock'            => 10,
            ],

            // ── CLASS C: Carbon Replacement Filters (Perishable — FIFO Critical)
            [
                'product_id'              => 'FILT-CARBON-01',
                'name'                    => 'Carbon Replacement Filter (Universal)',
                'sku'                     => 'WB-FILT-CARBON-UNI',
                'abc_class'               => 'C',
                'unit_price'              => 649.00,
                'unit_cost'               => 380.00,
                'is_perishable'           => true,
                'is_seasonal'             => false,
                'shelf_life_days'         => 270,
                'supplier_lead_time_days' => 7,
                'description'             => 'Universal carbon pre-filter. 270-day shelf life. FIFO enforcement active.',
                'initial_stock'           => 0,
                'safety_stock'            => 20,
            ],

            // ── CLASS C: AC Cleaning Kits (Non-Perishable Consumable) ──────────
            [
                'product_id'              => 'CLEAN-AC-01',
                'name'                    => 'AC Coil Cleaning Kit',
                'sku'                     => 'WB-CLEAN-AC-COIL',
                'abc_class'               => 'C',
                'unit_price'              => 349.00,
                'unit_cost'               => 190.00,
                'is_perishable'           => false,
                'is_seasonal'             => false,
                'shelf_life_days'         => null,
                'supplier_lead_time_days' => 7,
                'description'             => 'AC coil cleaner spray + brushes. No shelf life restriction.',
                'initial_stock'           => 150,
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

        $this->command->info('  Products seeded: 2× Class A Seasonal, 2× Class A Non-Seasonal, 3× Class B, 4× Class C.');
    }
}
