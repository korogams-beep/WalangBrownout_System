<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class InventoryService
{
    // =========================================================================
    // TRIGGER 1 — RECEIVE
    // Adds a new batch lot to the warehouse and increments quantity_on_hand.
    // Called when a Purchase Order delivery arrives.
    // =========================================================================

    /**
     * @throws RuntimeException
     */
    public function executeReceive(
        string $productId,
        int    $quantity,
        string $batchNumber,
        string $dateReceived,
        ?string $expiryDate,
        string $binLocation,
        int    $userId,
        string $poReference
    ): array {
        return DB::transaction(function () use (
            $productId, $quantity, $batchNumber, $dateReceived,
            $expiryDate, $binLocation, $userId, $poReference
        ) {
            $product   = Product::findOrFail($productId);
            $inventory = Inventory::where('product_id', $productId)
                                  ->lockForUpdate()
                                  ->firstOrFail();

            // Validate expiry is required for perishable products
            if ($product->is_perishable && ! $expiryDate) {
                throw new RuntimeException(
                    'EXPIRY_REQUIRED: Perishable product must have an expiry date on receipt.'
                );
            }

            // Create the new batch lot
            $batch = Batch::create([
                'batch_id'          => Str::uuid()->toString(),
                'product_id'        => $productId,
                'batch_number'      => $batchNumber,
                'date_received'     => $dateReceived,
                'expiry_date'       => $expiryDate,
                'quantity_received' => $quantity,
                'quantity_remains'  => $quantity,
                'bin_location'      => $binLocation,
            ]);

            // Increment physical stock
            $inventory->increment('quantity_on_hand', $quantity);

            $transaction = Transaction::create([
                'product_id'       => $productId,
                'batch_id'         => $batch->batch_id,
                'user_id'          => $userId,
                'transaction_type' => 'RECEIVE',
                'quantity_changed' => $quantity,
                'reference_number' => $poReference,
                'notes'            => "Stock received into bin {$binLocation}. Batch: {$batchNumber}.",
            ]);

            return ['batch' => $batch, 'transaction' => $transaction];
        });
    }

    // =========================================================================
    // TRIGGER 2 — COMMIT  (Online Checkout Reservation)
    // Increments quantity_committed and immediately reduces ATP.
    // Prevents overselling by blocking commits when ATP < requested qty.
    // =========================================================================

    /**
     * @throws RuntimeException
     */
    public function executeCommit(
        string $productId,
        int    $quantity,
        int    $userId,
        string $orderRef
    ): Transaction {
        return DB::transaction(function () use ($productId, $quantity, $userId, $orderRef) {
            $inventory = Inventory::where('product_id', $productId)
                                  ->lockForUpdate()
                                  ->firstOrFail();

            // ATP check — prevents "Mystery Shrinkage"
            if ($inventory->available_to_promise < $quantity) {
                throw new RuntimeException(
                    "ATP_INSUFFICIENT: Requested {$quantity} unit(s), but Available-to-Promise " .
                    "is only {$inventory->available_to_promise}."
                );
            }

            $inventory->increment('quantity_committed', $quantity);

            return Transaction::create([
                'product_id'       => $productId,
                'user_id'          => $userId,
                'transaction_type' => 'COMMIT',
                'quantity_changed' => $quantity,
                'reference_number' => $orderRef,
                'notes'            => "E-commerce checkout reservation. ATP decremented to {$inventory->fresh()->available_to_promise}.",
            ]);
        });
    }

    // =========================================================================
    // TRIGGER 3 — PICK  (Warehouse Barcode Scan & FIFO Lot Routing)
    // Validates the scanned batch against strict FIFO order for perishables.
    // Decrements quantity_on_hand, quantity_committed, and batch quantity_remains.
    // =========================================================================

    /**
     * @throws RuntimeException
     */
    public function executePick(
        string $productId,
        string $scannedBatchId,
        int    $quantity,
        int    $userId,
        string $orderRef
    ): Transaction {
        return DB::transaction(function () use ($productId, $scannedBatchId, $quantity, $userId, $orderRef) {
            $product      = Product::findOrFail($productId);
            $inventory    = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrFail();
            $scannedBatch = Batch::where('batch_id', $scannedBatchId)->lockForUpdate()->firstOrFail();

            // ─── FIFO Enforcement (Class C Carbon Filters & all perishables) ───
            if ($product->is_perishable) {
                $oldestBatch = Batch::where('product_id', $productId)
                                    ->where('quantity_remains', '>', 0)
                                    ->orderBy('expiry_date', 'asc')
                                    ->orderBy('date_received', 'asc')
                                    ->first();

                if ($oldestBatch && $oldestBatch->batch_id !== $scannedBatchId) {
                    throw new RuntimeException(
                        "FIFO_VIOLATION: Batch {$oldestBatch->batch_number} at bin " .
                        "{$oldestBatch->bin_location} (expires {$oldestBatch->expiry_date->toDateString()}) " .
                        "must be picked before this batch."
                    );
                }
            }

            // ─── Batch Capacity Check ───
            if ($scannedBatch->quantity_remains < $quantity) {
                throw new RuntimeException(
                    "BATCH_EXHAUSTED: Scanned batch {$scannedBatch->batch_number} only has " .
                    "{$scannedBatch->quantity_remains} unit(s) remaining."
                );
            }

            // ─── Committed Stock Check ───
            // Ensure there is a matching commitment to fulfil (prevents rogue picks)
            if ($inventory->quantity_committed < $quantity) {
                throw new RuntimeException(
                    "COMMITMENT_MISMATCH: Pick quantity {$quantity} exceeds committed " .
                    "quantity {$inventory->quantity_committed}."
                );
            }

            // Decrement batch lot
            $scannedBatch->decrement('quantity_remains', $quantity);

            // Decrement physical stock and resolve the reservation
            $inventory->decrement('quantity_on_hand', $quantity);
            $inventory->decrement('quantity_committed', $quantity);

            return Transaction::create([
                'product_id'       => $productId,
                'batch_id'         => $scannedBatchId,
                'user_id'          => $userId,
                'transaction_type' => 'PICK',
                'quantity_changed' => -$quantity,
                'reference_number' => $orderRef,
                'notes'            => "Barcode-verified FIFO pick from bin {$scannedBatch->bin_location}. " .
                                      "Batch: {$scannedBatch->batch_number}.",
            ]);
        });
    }

    // =========================================================================
    // TRIGGER 4 — ADJUST  (Cycle Count Reconciliation)
    // Overwrites quantity_on_hand with the audited physical count.
    // Records the variance with a forensic audit note.
    // =========================================================================

    /**
     * @throws RuntimeException
     */
    public function executeAdjust(
        string $productId,
        int    $actualPhysicalCount,
        int    $userId,
        string $reason
    ): Transaction {
        return DB::transaction(function () use ($productId, $actualPhysicalCount, $userId, $reason) {
            $inventory = Inventory::where('product_id', $productId)
                                  ->lockForUpdate()
                                  ->firstOrFail();

            $variance = $actualPhysicalCount - $inventory->quantity_on_hand;

            $inventory->update(['quantity_on_hand' => $actualPhysicalCount]);

            $direction = $variance >= 0 ? "+{$variance}" : (string) $variance;

            return Transaction::create([
                'product_id'       => $productId,
                'user_id'          => $userId,
                'transaction_type' => 'ADJUST',
                'quantity_changed' => $variance,
                'notes'            => "Cycle count audit adjustment. Variance: {$direction}. Reason: {$reason}.",
            ]);
        });
    }
}
