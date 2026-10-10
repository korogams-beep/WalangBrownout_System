<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasUuids;

    protected $primaryKey = 'transaction_id';

    protected $fillable = [
        'product_id',
        'batch_id',
        'user_id',
        'transaction_type',
        'quantity_changed',
        'reference_number',
        'notes',
    ];

    protected $casts = [
        'quantity_changed' => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class, 'batch_id', 'batch_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /** Filter by transaction type (RECEIVE, COMMIT, PICK, ADJUST). */
    public function scopeOfType($query, string $type)
    {
        return $query->where('transaction_type', strtoupper($type));
    }

    /** Transactions for a specific product. */
    public function scopeForProduct($query, string $productId)
    {
        return $query->where('product_id', $productId);
    }

    /** Transactions within a date range — useful for audit reports. */
    public function scopeInDateRange($query, string $from, string $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }
}
