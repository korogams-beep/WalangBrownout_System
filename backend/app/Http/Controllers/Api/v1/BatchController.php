<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class BatchController extends Controller
{
    public function __construct(protected InventoryService $inventoryService) {}

    /**
     * GET /api/v1/batches
     *
     * Returns all batches with product info. Supports filter by product_id.
     * ?product_id=FILT-CARBON-01&available_only=1
     */
    public function index(Request $request): JsonResponse
    {
        $query = Batch::with('product');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->boolean('available_only')) {
            $query->available();
        }

        if ($request->boolean('expiring_soon')) {
            $days = $request->integer('days', 30);
            $query->expiringSoon($days);
        }

        $batches = $query->fifoOrder()->get()->map(fn ($b) => array_merge(
            $b->toArray(),
            [
                'is_exhausted'      => $b->is_exhausted,
                'days_until_expiry' => $b->days_until_expiry,
            ]
        ));

        return response()->json([
            'success' => true,
            'data'    => $batches,
            'total'   => $batches->count(),
        ], 200);
    }

    /**
     * POST /api/v1/batches
     *
     * Registers a new batch lot AND records a RECEIVE transaction via InventoryService.
     * This is the primary stock-in endpoint (called when a PO delivery arrives).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'      => 'required|string|exists:products,product_id',
            'batch_number'    => 'required|string|max:100|unique:batches,batch_number',
            'date_received'   => 'required|date|before_or_equal:today',
            'expiry_date'     => 'nullable|date|after:date_received',
            'quantity'        => 'required|integer|min:1',
            'bin_location'    => 'required|string|max:50',
            'po_reference'    => 'required|string|max:100',
        ]);

        try {
            $result = $this->inventoryService->executeReceive(
                productId:    $validated['product_id'],
                quantity:     $validated['quantity'],
                batchNumber:  $validated['batch_number'],
                dateReceived: $validated['date_received'],
                expiryDate:   $validated['expiry_date'] ?? null,
                binLocation:  $validated['bin_location'],
                userId:       $request->user()->id,
                poReference:  $validated['po_reference']
            );

            return response()->json([
                'success'     => true,
                'message'     => 'Batch received and stock updated successfully.',
                'data'        => [
                    'batch'       => $result['batch'],
                    'transaction' => $result['transaction'],
                ],
            ], 201);
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => [
                    'code'    => 'RECEIVE_REJECTED',
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }
    }

    /**
     * GET /api/v1/batches/{batchId}
     *
     * Returns a single batch with its product and transaction history.
     */
    public function show(string $batchId): JsonResponse
    {
        $batch = Batch::with(['product', 'transactions.user'])->findOrFail($batchId);

        return response()->json([
            'success' => true,
            'data'    => array_merge($batch->toArray(), [
                'is_exhausted'      => $batch->is_exhausted,
                'days_until_expiry' => $batch->days_until_expiry,
            ]),
        ], 200);
    }

    /**
     * GET /api/v1/batches/oldest/{productId}
     *
     * Returns the single oldest available batch for a product.
     * Called by the barcode scanner UI to display which bin to pick from next.
     * Critical for FIFO enforcement on Class C carbon filters.
     */
    public function getOldestAvailable(string $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);

        $batch = Batch::where('product_id', $productId)
                      ->available()
                      ->fifoOrder()
                      ->first();

        if (! $batch) {
            return response()->json([
                'error' => [
                    'code'    => 'NO_STOCK',
                    'message' => "No available batches found for product {$productId}.",
                ],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => array_merge($batch->toArray(), [
                'is_exhausted'      => $batch->is_exhausted,
                'days_until_expiry' => $batch->days_until_expiry,
                'is_perishable'     => $product->is_perishable,
            ]),
        ], 200);
    }

    /**
     * DELETE /api/v1/batches/{batchId}
     *
     * Deletes a batch record. Only allowed if quantity_remains = 0.
     * Admin only.
     */
    public function destroy(string $batchId): JsonResponse
    {
        $batch = Batch::findOrFail($batchId);

        if ($batch->quantity_remains > 0) {
            return response()->json([
                'error' => [
                    'code'    => 'BATCH_NOT_EXHAUSTED',
                    'message' => "Cannot delete batch {$batch->batch_number} — it still has {$batch->quantity_remains} unit(s) remaining.",
                ],
            ], 422);
        }

        $batch->delete();

        return response()->json([
            'success' => true,
            'message' => "Batch {$batchId} deleted successfully.",
        ], 200);
    }
}
