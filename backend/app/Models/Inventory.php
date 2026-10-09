<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    protected $primaryKey = 'product_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'product_id',
        'quantity_on_hand',
        'quantity_committed',
        'safety_stock',
    ];

    protected $casts = [
        'quantity_on_hand'    => 'integer',
        'quantity_committed'  => 'integer',
        'safety_stock'        => 'integer',
    ];

    /**
     * Append ATP as a virtual attribute on every serialized response.
     * ATP = QuantityOnHand - QuantityCommitted  (never goes below 0)
     */
    protected $appends = ['available_to_promise'];

    // -------------------------------------------------------------------------
    // Virtual Attributes
    // -------------------------------------------------------------------------

    /**
     * Available-to-Promise: the quantity a new online order can safely commit.
     * Formula: ATP = QOH - QC
     */
    public function getAvailableToPromiseAttribute(): int
    {
        return max(0, $this->quantity_on_hand - $this->quantity_committed);
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
