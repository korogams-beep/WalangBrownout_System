<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Batch extends Model
{
    protected $primaryKey = 'batch_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'batch_id',
        'product_id',
        'batch_number',
        'date_received',
        'expiry_date',
        'quantity_received',
        'quantity_remains',
        'bin_location',
    ];

    protected $casts = [
        'date_received'     => 'date',
        'expiry_date'       => 'date',
        'quantity_received' => 'integer',
        'quantity_remains'  => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Virtual Attributes
    // -------------------------------------------------------------------------

    /**
     * Whether this batch is fully exhausted (nothing left to pick).
     */
    public function getIsExhaustedAttribute(): bool
    {
        return $this->quantity_remains <= 0;
    }

    /**
     * Days until expiry from today. Negative = already expired.
     * Returns null for non-perishable batches.
     */
    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (! $this->expiry_date) {
            return null;
        }

        return (int) now()->startOfDay()->diffInDays($this->expiry_date->startOfDay(), false);
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'batch_id', 'batch_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /** Only batches that still have stock remaining. */
    public function scopeAvailable($query)
    {
        return $query->where('quantity_remains', '>', 0);
    }

    /**
     * Oldest-first FIFO ordering for perishable picking.
     * Primary: expiry_date ASC  (soonest to expire goes first)
     * Secondary: date_received ASC  (oldest receipt date breaks ties)
     */
    public function scopeFifoOrder($query)
    {
        return $query->orderBy('expiry_date', 'asc')
                     ->orderBy('date_received', 'asc');
    }

    /** Batches expiring within a given number of days — useful for alerts. */
    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->whereNotNull('expiry_date')
                     ->whereDate('expiry_date', '<=', now()->addDays($days))
                     ->where('quantity_remains', '>', 0);
    }
}
