<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Product;
use App\Services\RopService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReorderAlertController extends Controller
{
    public function __construct(protected RopService $ropService) {}

    /**
     * GET /api/v1/alerts/reorder
     *
     * Returns all products where ATP <= ROP (needs reorder).
     * Drives the warning badges on the Dashboard and Analysis pages.
     *
     * Response includes per-product ROP calculation details so the frontend
     * can display exactly how close the stock is to the threshold.
     *
     * Optional: ?product_id=X to check a single product.
     */
    public function getAlerts(Request $request): JsonResponse
    {
        $query = Product::with('inventory');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $products = $query->get();
        $alerts   = $this->ropService->getReorderAlerts($products);

        return response()->json([
            'success' => true,
            'data'    => $alerts,
            'total'   => count($alerts),
            'checked_at' => now()->toIso8601String(),
        ], 200);
    }

    /**
     * GET /api/v1/alerts/reorder/{productId}
     *
     * Returns the detailed ROP calculation for a single product.
     * Useful for the product detail page to show real-time reorder status.
     */
    public function showProduct(string $productId): JsonResponse
    {
        $product = Product::with('inventory')->findOrFail($productId);
        $rop     = $this->ropService->calculateRop($product);

        return response()->json([
            'success' => true,
            'data'    => array_merge(
                ['product_id' => $product->product_id, 'product_name' => $product->name],
                $rop
            ),
        ], 200);
    }

    /**
     * GET /api/v1/alerts/expiry
     *
     * Returns batches of perishable products expiring within N days.
     * Default: 30 days. Override with ?days=60
     * Drives the "Expiry Trap" prevention dashboard card.
     */
    public function getExpiryAlerts(Request $request): JsonResponse
    {
        $days = $request->integer('days', 30);

        $batches = Batch::with('product')
                        ->expiringSoon($days)
                        ->fifoOrder()
                        ->get()
                        ->map(fn ($b) => [
                            'batch_id'          => $b->batch_id,
                            'batch_number'      => $b->batch_number,
                            'product_id'        => $b->product_id,
                            'product_name'      => $b->product->name,
                            'bin_location'      => $b->bin_location,
                            'quantity_remains'  => $b->quantity_remains,
                            'expiry_date'       => $b->expiry_date->toDateString(),
                            'days_until_expiry' => $b->days_until_expiry,
                        ]);

        return response()->json([
            'success'        => true,
            'data'           => $batches,
            'total'          => $batches->count(),
            'days_threshold' => $days,
            'checked_at'     => now()->toIso8601String(),
        ], 200);
    }
}
