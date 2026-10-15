<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Batch;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use RuntimeException;

class OrderTransactionController extends Controller
{
    public function __construct(protected InventoryService $inventoryService) {}

    /**
     * Helper to find a transaction by its primary key or alias.
     */
    protected function findTransaction(string $id): Transaction
    {
        return Transaction::where('transaction_id', $id)
            ->orWhere('id', $id)
            ->firstOrFail();
    }

    /**
     * GET /api/v1/transactions
     * Returns all transactions with relational data.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transaction::with(['product', 'batch', 'supplier', 'user'])
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

        $transactions = $query->get()->map(function ($t) {
            $type = $t->type ?: ($t->transaction_type === 'RECEIVE' ? 'Orders' : ($t->transaction_type === 'COMMIT' || $t->transaction_type === 'PICK' ? 'Sale' : 'Orders'));
            return [
                'id'             => $t->transaction_id,
                'transaction_id' => $t->transaction_id,
                'type'           => $type,
                'status'         => $t->status ?: 'Completed',
                'productId'      => $t->product_id,
                'product_id'     => $t->product_id,
                'productName'    => $t->product?->name ?? $t->product_id,
                'qty'            => $t->quantity ?: abs($t->quantity_changed ?: 0),
                'quantity'       => $t->quantity ?: abs($t->quantity_changed ?: 0),
                'location'       => $t->location,
                'expiryDate'     => $t->expiry_date?->toDateString(),
                'batchId'        => $t->batch_id,
                'supplierId'     => $t->supplier_id,
                'supplier'       => $t->supplier,
                'dateTime'       => $t->created_at?->toIso8601String() ?? now()->toIso8601String(),
                'created_at'     => $t->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $transactions,
            'total'   => $transactions->count(),
        ], 200);
    }

    /**
     * POST /api/v1/transactions
     * Creates a new transaction and persists to MySQL.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id'          => 'nullable|string|max:64',
            'product_id'  => 'nullable|string|exists:products,product_id',
            'productId'   => 'nullable|string|exists:products,product_id',
            'type'        => 'required|string|max:32',
            'status'      => 'nullable|string|max:32',
            'qty'         => 'nullable|integer|min:1',
            'quantity'    => 'nullable|integer|min:1',
            'location'    => 'nullable|string|max:100',
            'expiryDate'  => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'supplierId'  => 'nullable|string|max:36',
            'supplier_id' => 'nullable|string|max:36',
            'notes'       => 'nullable|string',
        ]);

        $productId = $validated['product_id'] ?? $validated['productId'];
        if (!$productId) {
            return response()->json(['error' => ['message' => 'Product is required.']], 422);
        }

        $qty = $validated['qty'] ?? $validated['quantity'] ?? 1;
        $type = $validated['type'];
        $status = $validated['status'] ?? 'Open';
        $location = $validated['location'] ?? null;
        $expiryDate = $validated['expiryDate'] ?? $validated['expiry_date'] ?? null;
        $supplierId = $validated['supplierId'] ?? $validated['supplier_id'] ?? null;

        // Auto-generate ID if not passed
        $id = $validated['id'] ?? null;
        if (!$id) {
            $count = Transaction::count() + 1;
            $candidate = 'T-' . str_pad((string)$count, 3, '0', STR_PAD_LEFT);
            while (Transaction::where('transaction_id', $candidate)->exists()) {
                $count++;
                $candidate = 'T-' . str_pad((string)$count, 3, '0', STR_PAD_LEFT);
            }
            $id = $candidate;
        }

        // Map to transaction_type enum for backward compatibility
        $txnTypeEnum = match (strtoupper($type)) {
            'SALE'    => 'COMMIT',
            'ORDERS'  => 'RECEIVE',
            'RETURNS' => 'RECEIVE',
            default   => 'RECEIVE',
        };

        // If Sale is created at Open, commit inventory after validating ATP
        if ($type === 'Sale') {
            $inventory = Inventory::where('product_id', $productId)->first();
            if ($inventory) {
                if ($qty > $inventory->available_to_promise) {
                    return response()->json([
                        'error' => [
                            'code'    => 'INSUFFICIENT_ATP',
                            'message' => "Requested quantity ({$qty}) exceeds available-to-promise stock ({$inventory->available_to_promise}).",
                        ],
                    ], 422);
                }
                $inventory->quantity_committed += $qty;
                $inventory->save();
            }
        }

        $transaction = Transaction::create([
            'transaction_id'   => $id,
            'product_id'       => $productId,
            'type'             => $type,
            'status'           => $status,
            'transaction_type' => $txnTypeEnum,
            'quantity'         => $qty,
            'quantity_changed' => $type === 'Sale' ? -$qty : $qty,
            'location'         => $location,
            'expiry_date'      => $expiryDate,
            'supplier_id'      => $supplierId,
            'user_id'          => $request->user()?->id,
            'notes'            => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaction created successfully.',
            'data'    => array_merge($transaction->toArray(), [
                'id'        => $transaction->transaction_id,
                'qty'       => $transaction->quantity,
                'productId' => $transaction->product_id,
                'dateTime'  => $transaction->created_at?->toIso8601String(),
            ]),
        ], 201);
    }

    /**
     * GET /api/v1/transactions/{id}
     */
    public function show(string $id): JsonResponse
    {
        $transaction = $this->findTransaction($id)->load(['product', 'batch', 'supplier', 'user']);

        return response()->json([
            'success' => true,
            'data'    => $transaction,
        ], 200);
    }

    /**
     * PUT /api/v1/transactions/{id}
     * Updates transaction details and handles stock progression in MySQL.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $transaction = $this->findTransaction($id);
        $oldStatus = $transaction->status;

        $validated = $request->validate([
            'status'      => 'nullable|string|max:32',
            'qty'         => 'nullable|integer|min:1',
            'quantity'    => 'nullable|integer|min:1',
            'type'        => 'nullable|string|max:32',
            'location'    => 'nullable|string|max:100',
            'expiryDate'  => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'supplierId'  => 'nullable|string|max:36',
            'supplier_id' => 'nullable|string|max:36',
            'notes'       => 'nullable|string',
        ]);

        $newStatus = $validated['status'] ?? $transaction->status;
        $qty = $validated['qty'] ?? $validated['quantity'] ?? $transaction->quantity;

        // Apply Stock Effects when advancing status
        $inventory = Inventory::where('product_id', $transaction->product_id)->first();

        if ($inventory && $newStatus !== $oldStatus) {
            // Orders: stock added on Received or Completed
            if ($transaction->type === 'Orders') {
                if (in_array($newStatus, ['Received', 'Completed']) && !in_array($oldStatus, ['Received', 'Completed'])) {
                    $inventory->quantity_on_hand += $qty;
                    $inventory->save();

                    // If perishable and no batch yet, create a batch
                    $product = Product::find($transaction->product_id);
                    if ($product && $product->is_perishable && !$transaction->batch_id) {
                        $batchNumber = 'LOT-' . strtoupper(Str::random(6));
                        $expiry = $transaction->expiry_date ?: now()->addDays($product->shelf_life_days ?: 270)->toDateString();
                        $batch = Batch::create([
                            'batch_id'          => 'BATCH-' . $product->product_id . '-' . str_pad((string)(Batch::count() + 1), 3, '0', STR_PAD_LEFT),
                            'product_id'        => $product->product_id,
                            'batch_number'      => $batchNumber,
                            'date_received'     => now()->toDateString(),
                            'expiry_date'       => $expiry,
                            'quantity_received' => $qty,
                            'quantity_remains'  => $qty,
                            'bin_location'      => $transaction->location ?: 'Main Warehouse',
                        ]);
                        $transaction->batch_id = $batch->batch_id;
                    }
                }
            }
            // Sale: stock decremented on Shipped or Completed
            elseif ($transaction->type === 'Sale') {
                if (in_array($newStatus, ['Shipped', 'Completed']) && !in_array($oldStatus, ['Shipped', 'Completed'])) {
                    $inventory->quantity_on_hand = max(0, $inventory->quantity_on_hand - $qty);
                    $inventory->quantity_committed = max(0, $inventory->quantity_committed - $qty);
                    $inventory->save();
                }
            }
            // Returns: stock returned on Received or Completed
            elseif ($transaction->type === 'Returns') {
                if (in_array($newStatus, ['Received', 'Completed']) && !in_array($oldStatus, ['Received', 'Completed'])) {
                    $inventory->quantity_on_hand += $qty;
                    $inventory->save();
                }
            }

            // Cancelled: if Sale was cancelled, release committed stock
            if ($newStatus === 'Cancelled' && $transaction->type === 'Sale' && !in_array($oldStatus, ['Shipped', 'Completed'])) {
                $inventory->quantity_committed = max(0, $inventory->quantity_committed - $qty);
                $inventory->save();
            }
        }

        $transaction->status = $newStatus;
        if (array_key_exists('qty', $validated) || array_key_exists('quantity', $validated)) {
            $transaction->quantity = $qty;
            $transaction->quantity_changed = $transaction->type === 'Sale' ? -$qty : $qty;
        }
        if (isset($validated['location'])) $transaction->location = $validated['location'];
        if (isset($validated['expiryDate']) || isset($validated['expiry_date'])) {
            $transaction->expiry_date = $validated['expiryDate'] ?? $validated['expiry_date'];
        }
        if (isset($validated['supplierId']) || isset($validated['supplier_id'])) {
            $transaction->supplier_id = $validated['supplierId'] ?? $validated['supplier_id'];
        }
        if (isset($validated['notes'])) $transaction->notes = $validated['notes'];

        $transaction->save();

        return response()->json([
            'success' => true,
            'message' => 'Transaction updated successfully.',
            'data'    => array_merge($transaction->toArray(), [
                'id'        => $transaction->transaction_id,
                'qty'       => $transaction->quantity,
                'productId' => $transaction->product_id,
                'dateTime'  => $transaction->created_at?->toIso8601String(),
            ]),
        ], 200);
    }

    /**
     * DELETE /api/v1/transactions/{id}
     * Deletes transaction from MySQL and rolls back unfulfilled reservations.
     */
    public function destroy(string $id): JsonResponse
    {
        $transaction = $this->findTransaction($id);

        // If it was an open sale, release reserved commitment
        if ($transaction->type === 'Sale' && in_array($transaction->status, ['Open', 'Picked'])) {
            $inventory = Inventory::where('product_id', $transaction->product_id)->first();
            if ($inventory) {
                $inventory->quantity_committed = max(0, $inventory->quantity_committed - $transaction->quantity);
                $inventory->save();
            }
        }

        $transaction->delete();

        return response()->json([
            'success' => true,
            'message' => "Transaction {$id} deleted successfully.",
        ], 200);
    }

    /**
     * POST /api/v1/transactions/commit
     * Trigger 2 — Online Checkout Reservation.
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
     * Trigger 3 — Warehouse Barcode Scan & FIFO Lot Routing.
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
     * Trigger 4 — Cycle Count Reconciliation.
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
