<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class InventoryController extends Controller
{
    /**
     * GET /api/v1/inventory
     *
     * Returns all inventory rows joined with product details.
     * Each row includes the computed available_to_promise (ATP) attribute.
     * This is the primary data source for the Dashboard and Inventory List pages.
     */
    public function index(): JsonResponse
    {
        $inventory = Inventory::with('product')
                              ->get()
                              ->map(function ($inv) {
                                  return [
                                      'product_id'            => $inv->product_id,
                                      'name'                  => $inv->product->name,
                                      'sku'                   => $inv->product->sku,
                                      'abc_class'             => $inv->product->abc_class,
                                      'is_perishable'         => $inv->product->is_perishable,
                                      'is_seasonal'           => $inv->product->is_seasonal,
                                      'unit_price'            => $inv->product->unit_price,
                                      'unit_cost'             => $inv->product->unit_cost,
                                      'quantity_on_hand'      => $inv->quantity_on_hand,
                                      'quantity_committed'    => $inv->quantity_committed,
                                      'available_to_promise'  => $inv->available_to_promise,
                                      'safety_stock'          => $inv->safety_stock,
                                      'updated_at'            => $inv->updated_at,
                                  ];
                              });

        return response()->json([
            'success' => true,
            'data'    => $inventory,
            'total'   => $inventory->count(),
        ], 200);
    }

    /**
     * GET /api/v1/inventory/{productId}
     *
     * Returns the inventory status for a single product with full product details.
     * Used by the product detail page and the barcode scanner to verify ATP before pick.
     */
    public function show(string $productId): JsonResponse
    {
        $product   = Product::with('inventory')->findOrFail($productId);
        $inventory = $product->inventory;

        return response()->json([
            'success' => true,
            'data'    => [
                'product_id'           => $product->product_id,
                'name'                 => $product->name,
                'sku'                  => $product->sku,
                'abc_class'            => $product->abc_class,
                'is_perishable'        => $product->is_perishable,
                'is_seasonal'          => $product->is_seasonal,
                'supplier_lead_time'   => $product->supplier_lead_time_days,
                'quantity_on_hand'     => $inventory->quantity_on_hand,
                'quantity_committed'   => $inventory->quantity_committed,
                'available_to_promise' => $inventory->available_to_promise,
                'safety_stock'         => $inventory->safety_stock,
                'updated_at'           => $inventory->updated_at,
            ],
        ], 200);
    }
}
