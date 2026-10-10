<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class OrderTransactionController extends Controller
{
    public function __construct(protected InventoryService $inventoryService) {}

    /**
     * GET /api/v1/transactions
     *
     * Returns paginated transaction audit log.
     * Supports filters: ?product_id=X&type=PICK&from=2026-01-01&to=2026-12-31
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transaction::with(['product', 'batch', 'user'])
                            ->latest('created_at');

        if ($request->filled('product_id')) {
            $query->forProduct($request->product_id);
        }

        if ($request->filled('type')) {
            $query->ofType($request->type);
        }

        if ($request->filled('from') && $request->filled('to')) {
            $query->inDateRange($request->from, $request->to . ' 23:59:59');
        }

        $transactions = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'success' => true,
            'data'    => $transactions->items(),
            'meta'    => [
                'current_page' => $transactions->currentPage(),
                'last_page'    => $transactions->lastPage(),
                'per_page'     => $transactions->perPage(),
                'total'        => $transactions->total(),
            ],
        ], 200);
    }

    /**
     * POST /api/v1/transactions/commit
     *
     * Trigger 2 — Online Checkout Reservation.
     * Increments quantity_committed and decrements ATP immediately.
     * Rejects if ATP < requested quantity (prevents Mystery Shrinkage).
     */
    public function commitOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'      => 'required|string|exists:products,product_id',
            'quantity'        => 'required|integer|min:1',
            'order_reference' => 'required|string|max:100',
        ]);

        try {
            $transaction = $this->inventoryService->executeCommit(
                productId: $validated['product_id'],
                quantity:  $validated['quantity'],
                userId:    $request->user()->id,
                orderRef:  $validated['order_reference']
            );

            return response()->json([
                'success'     => true,
                'message'     => 'Inventory committed successfully. ATP decremented.',
                'data'        => $transaction,
            ], 201);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => [
                    'code'    => 'TRANSACTION_REJECTED',
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }
    }

    /**
     * POST /api/v1/transactions/pick
     *
     * Trigger 3 — Warehouse Barcode Scan & FIFO Lot Routing.
     * Validates scanned batch against FIFO order for perishable products.
     * Decrements quantity_on_hand, quantity_committed, and batch quantity_remains.
     */
    public function pickBarcode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'       => 'required|string|exists:products,product_id',
            'scanned_batch_id' => 'required|string|exists:batches,batch_id',
            'quantity'         => 'required|integer|min:1',
            'order_reference'  => 'required|string|max:100',
        ]);

        try {
            $transaction = $this->inventoryService->executePick(
                productId:     $validated['product_id'],
                scannedBatchId: $validated['scanned_batch_id'],
                quantity:      $validated['quantity'],
                userId:        $request->user()->id,
                orderRef:      $validated['order_reference']
            );

            return response()->json([
                'success' => true,
                'message' => 'Pick executed successfully. Stock and commitment updated.',
                'data'    => $transaction,
            ], 200);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => [
                    'code'    => 'FIFO_SCAN_ERROR',
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }
    }

    /**
     * POST /api/v1/transactions/adjust
     *
     * Trigger 4 — Cycle Count Reconciliation.
     * Overwrites quantity_on_hand with the physical count.
     * Logs variance with a forensic audit note.
     */
    public function adjustCount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'           => 'required|string|exists:products,product_id',
            'actual_physical_count' => 'required|integer|min:0',
            'reason'               => 'required|string|max:255',
        ]);

        try {
            $transaction = $this->inventoryService->executeAdjust(
                productId:           $validated['product_id'],
                actualPhysicalCount: $validated['actual_physical_count'],
                userId:              $request->user()->id,
                reason:              $validated['reason']
            );

            return response()->json([
                'success' => true,
                'message' => 'Physical cycle adjustment logged successfully.',
                'data'    => $transaction,
            ], 200);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => [
                    'code'    => 'ADJUST_FAILED',
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }
    }
}
