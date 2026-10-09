<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $primaryKey = 'product_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'product_id',
        'name',
        'sku',
        'abc_class',
        'unit_price',
        'unit_cost',
        'is_perishable',
        'is_seasonal',
        'shelf_life_days',
        'supplier_lead_time_days',
        'description',
        'image_url',
    ];

    protected $casts = [
        'is_perishable'            => 'boolean',
        'is_seasonal'              => 'boolean',
        'unit_price'               => 'decimal:2',
        'unit_cost'                => 'decimal:2',
        'shelf_life_days'          => 'integer',
        'supplier_lead_time_days'  => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Each product has exactly one inventory row (1:1).
     */
    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class, 'product_id', 'product_id');
    }

    /**
     * A product can have many FIFO batch lots (1:N).
     * Default order: oldest expiry first so perishable picks are always FIFO-safe.
     */
    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class, 'product_id', 'product_id')
                    ->orderBy('expiry_date', 'asc')
                    ->orderBy('date_received', 'asc');
    }

    /**
     * Full transaction audit trail for this product.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'product_id', 'product_id')
                    ->latest();
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /** Only perishable products (Class C carbon filters). */
    public function scopePerishable($query)
    {
        return $query->where('is_perishable', true);
    }

    /** Only seasonal products (Portable AC units). */
    public function scopeSeasonal($query)
    {
        return $query->where('is_seasonal', true);
    }

    /** Filter by ABC class. */
    public function scopeOfClass($query, string $class)
    {
        return $query->where('abc_class', strtoupper($class));
    }
}
