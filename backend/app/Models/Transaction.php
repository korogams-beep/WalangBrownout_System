<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasUuids;

    protected $primaryKey = 'transaction_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'transaction_id',
        'product_id',
        'batch_id',
        'supplier_id',
        'user_id',
        'transaction_type',
        'type',
        'status',
        'quantity',
        'quantity_changed',
        'reference_number',
        'location',
        'expiry_date',
        'notes',
    ];

    protected $casts = [
        'quantity'         => 'integer',
        'quantity_changed' => 'integer',
        'expiry_date'      => 'date',
    ];

    protected $appends = [
        'id',
        'qty',
        'date_time',
    ];

    // -------------------------------------------------------------------------
    // Accessors for Frontend Compatibility
    // -------------------------------------------------------------------------

    public function getIdAttribute(): string
    {
        return $this->attributes['transaction_id'] ?? '';
    }

    public function getQtyAttribute(): int
    {
        return $this->attributes['quantity'] ?? abs($this->attributes['quantity_changed'] ?? 0);
    }

    public function getDateTimeAttribute(): ?string
    {
        return $this->created_at ? $this->created_at->toIso8601String() : null;
    }

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

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /** Filter by transaction type. */
    public function scopeOfType($query, string $type)
    {
        return $query->where(function ($q) use ($type) {
            $q->where('type', $type)
              ->orWhere('transaction_type', strtoupper($type));
        });
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
