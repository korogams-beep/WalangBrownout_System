<?php

namespace App\Services;

use App\Models\Product;

class RopService
{
    // =========================================================================
    // Monthly Seasonal Indices for Portable AC Units
    // Calibrated to Philippine climate: peak demand March–June (summer crunch),
    // near-zero demand October–February (off-season storage risk).
    //
    // Formula: SI_m = D̄_m / D̄_monthly_avg
    // Values are normalized so their average ≈ 1.0
    // =========================================================================
    private array $seasonalIndices = [
        1  => 0.3,   // January   — cool dry season, near-zero AC demand
        2  => 0.4,   // February  — mild, marginal demand
        3  => 1.2,   // March     — early summer ramp-up
        4  => 2.4,   // April     — hot, strong demand
        5  => 2.8,   // May       — peak summer demand
        6  => 3.2,   // June      — highest peak (Summer Crunch)
        7  => 1.8,   // July      — rainy season starts, demand drops
        8  => 0.8,   // August    — moderate rainy
        9  => 0.3,   // September — low demand
        10 => 0.2,   // October   — lowest demand
        11 => 0.2,   // November  — ber months, negligible
        12 => 0.3,   // December  — holiday, minor uptick
    ];

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Calculate the Reorder Point (ROP) for a product.
     *
     * Returns a structured array with all inputs and outputs for the
     * frontend to display on the Reorder Alerts dashboard.
     *
     * @param Product $product     Eager-loaded with ->inventory
     * @param int     $currentMonth  1–12, defaults to current calendar month
     */
    public function calculateRop(Product $product, ?int $currentMonth = null): array
    {
        $currentMonth ??= (int) now()->format('n');
        $inventory      = $product->inventory;

        if ($product->is_seasonal) {
            return $this->seasonalRop($product, $inventory, $currentMonth);
        }

        return $this->standardRop($product, $inventory);
    }

    /**
     * Bulk-calculate ROP for an entire product collection.
     * Returns only products that currently need reordering.
     */
    public function getReorderAlerts(iterable $products): array
    {
        $alerts       = [];
        $currentMonth = (int) now()->format('n');

        foreach ($products as $product) {
            $rop = $this->calculateRop($product, $currentMonth);
            if ($rop['needs_reorder']) {
                $alerts[] = array_merge(['product_id' => $product->product_id, 'product_name' => $product->name], $rop);
            }
        }

        return $alerts;
    }

    // =========================================================================
    // PRIVATE CALCULATIONS
    // =========================================================================

    /**
     * Seasonal ROP — applied to Portable AC Units (Class A, is_seasonal = true).
     *
     * Formulas:
     *   d_seasonal = (D_annual_base / 365) × SI_m
     *   ROP_seasonal = (d_seasonal × LT) + SS_seasonal
     *
     * Safety stock scales with seasonal index:
     *   SI > 2.0  → SS = 80  (peak buffer — Summer Crunch protection)
     *   SI > 1.0  → SS = 50  (shoulder season)
     *   otherwise → SS = 15  (off-season minimum)
     */
    private function seasonalRop(Product $product, $inventory, int $month): array
    {
        $leadTime        = $product->supplier_lead_time_days;
        $baseAnnualDemand = 5_475;                          // 15 units/day baseline
        $dailyBase       = $baseAnnualDemand / 365;
        $si              = $this->seasonalIndices[$month] ?? 1.0;
        $dSeasonal       = $dailyBase * $si;

        $safetyStock = match (true) {
            $si > 2.0 => 80,
            $si > 1.0 => 50,
            default   => 15,
        };

        $rop = ($dSeasonal * $leadTime) + $safetyStock;
        $atp = $inventory->available_to_promise;

        return [
            'type'                   => 'SEASONAL',
            'current_month'          => $month,
            'seasonal_index'         => round($si, 2),
            'base_annual_demand'     => $baseAnnualDemand,
            'adjusted_daily_demand'  => round($dSeasonal, 2),
            'lead_time_days'         => $leadTime,
            'safety_stock'           => $safetyStock,
            'reorder_point'          => (int) ceil($rop),
            'quantity_on_hand'       => $inventory->quantity_on_hand,
            'quantity_committed'     => $inventory->quantity_committed,
            'available_to_promise'   => $atp,
            'needs_reorder'          => $atp <= (int) ceil($rop),
            'shortage'               => max(0, (int) ceil($rop) - $atp),
        ];
    }

    /**
     * Standard ROP — applied to Class A (Thermostats) and Class B (Air Purifiers).
     *
     * Formulas:
     *   ROP = (d × LT) + SS
     *   SS  = (d_max × LT_max) - (d_avg × LT_avg)
     *
     * Uses conservative fixed demand rates per product class:
     *   Class A non-seasonal  → 3 units/day
     *   Class B               → 2 units/day
     *   Class C non-perishable → 1 unit/day
     */
    private function standardRop(Product $product, $inventory): array
    {
        $leadTime = $product->supplier_lead_time_days;

        // Daily demand estimate by ABC class
        $dailyDemand = match ($product->abc_class) {
            'A'     => 3,
            'B'     => 2,
            default => 1,
        };

        $safetyStock = $inventory->safety_stock;

        // SS = (d_max × LT_max) - (d_avg × LT_avg)
        // d_max = 1.5× daily demand; LT_max = 1.5× lead time (supplier variability buffer)
        $computedSS  = (int) ceil(($dailyDemand * 1.5 * $leadTime * 1.5) - ($dailyDemand * $leadTime));
        $effectiveSS = max($safetyStock, $computedSS);

        $rop = ($dailyDemand * $leadTime) + $effectiveSS;
        $atp = $inventory->available_to_promise;

        return [
            'type'                  => 'NON_SEASONAL',
            'daily_demand'          => $dailyDemand,
            'lead_time_days'        => $leadTime,
            'safety_stock_stored'   => $safetyStock,
            'safety_stock_computed' => $computedSS,
            'safety_stock_used'     => $effectiveSS,
            'reorder_point'         => (int) ceil($rop),
            'quantity_on_hand'      => $inventory->quantity_on_hand,
            'quantity_committed'    => $inventory->quantity_committed,
            'available_to_promise'  => $atp,
            'needs_reorder'         => $atp <= (int) ceil($rop),
            'shortage'              => max(0, (int) ceil($rop) - $atp),
        ];
    }
}
