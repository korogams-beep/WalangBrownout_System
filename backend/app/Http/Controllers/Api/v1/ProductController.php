<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * GET /api/v1/products
     *
     * Returns full product catalog with live inventory and ATP.
     * Supports optional filters: ?abc_class=A&is_seasonal=1&is_perishable=1
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('inventory');

        if ($request->filled('abc_class')) {
            $query->ofClass($request->abc_class);
        }

        if ($request->filled('is_seasonal')) {
            $query->where('is_seasonal', (bool) $request->is_seasonal);
        }

        if ($request->filled('is_perishable')) {
            $query->where('is_perishable', (bool) $request->is_perishable);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku', 'like', "%{$request->search}%")
                  ->orWhere('product_id', 'like', "%{$request->search}%");
            });
        }

        $products = $query->orderBy('abc_class')->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data'    => $products,
            'total'   => $products->count(),
        ], 200);
    }

    /**
     * POST /api/v1/products
     *
     * Creates a new product and its corresponding inventory row.
     * Auto-generates a product_id if none is provided.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'              => 'nullable|string|max:36|unique:products,product_id',
            'name'                    => 'required|string|max:255',
            'sku'                     => 'required|string|max:100|unique:products,sku',
            'abc_class'               => 'required|in:A,B,C',
            'unit_price'              => 'required|numeric|min:0',
            'unit_cost'               => 'required|numeric|min:0',
            'is_perishable'           => 'boolean',
            'is_seasonal'             => 'boolean',
            'shelf_life_days'         => 'nullable|integer|min:1',
            'supplier_lead_time_days' => 'integer|min:1',
            'description'             => 'nullable|string',
            'image_url'               => 'nullable|url',
            'initial_stock'           => 'integer|min:0',
            'safety_stock'            => 'integer|min:0',
        ]);

        $productId = $validated['product_id'] ?? Str::upper(Str::slug($validated['name'], '-'));

        $product = Product::create([
            'product_id'              => $productId,
            'name'                    => $validated['name'],
            'sku'                     => $validated['sku'],
            'abc_class'               => $validated['abc_class'],
            'unit_price'              => $validated['unit_price'],
            'unit_cost'               => $validated['unit_cost'],
            'is_perishable'           => $validated['is_perishable'] ?? false,
            'is_seasonal'             => $validated['is_seasonal'] ?? false,
            'shelf_life_days'         => $validated['shelf_life_days'] ?? null,
            'supplier_lead_time_days' => $validated['supplier_lead_time_days'] ?? 14,
            'description'             => $validated['description'] ?? null,
            'image_url'               => $validated['image_url'] ?? null,
        ]);

        // Auto-create inventory row on product creation
        Inventory::create([
            'product_id'         => $productId,
            'quantity_on_hand'   => $validated['initial_stock'] ?? 0,
            'quantity_committed' => 0,
            'safety_stock'       => $validated['safety_stock'] ?? 10,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully.',
            'data'    => $product->load('inventory'),
        ], 201);
    }

    /**
     * GET /api/v1/products/{productId}
     *
     * Returns a single product with its inventory, batches, and recent transactions.
     */
    public function show(string $productId): JsonResponse
    {
        $product = Product::with(['inventory', 'batches', 'transactions' => fn($q) => $q->limit(20)])
                          ->findOrFail($productId);

        return response()->json([
            'success' => true,
            'data'    => $product,
        ], 200);
    }

    /**
     * PUT /api/v1/products/{productId}
     *
     * Updates product catalog fields. Inventory adjustments go through
     * the /transactions/adjust endpoint, not here.
     */
    public function update(Request $request, string $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);

        $validated = $request->validate([
            'name'                    => 'sometimes|string|max:255',
            'sku'                     => "sometimes|string|max:100|unique:products,sku,{$productId},product_id",
            'abc_class'               => 'sometimes|in:A,B,C',
            'unit_price'              => 'sometimes|numeric|min:0',
            'unit_cost'               => 'sometimes|numeric|min:0',
            'is_perishable'           => 'sometimes|boolean',
            'is_seasonal'             => 'sometimes|boolean',
            'shelf_life_days'         => 'nullable|integer|min:1',
            'supplier_lead_time_days' => 'sometimes|integer|min:1',
            'description'             => 'nullable|string',
            'image_url'               => 'nullable|url',
        ]);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully.',
            'data'    => $product->fresh('inventory'),
        ], 200);
    }

    /**
     * DELETE /api/v1/products/{productId}
     *
     * Soft-deletes cascade: inventory and batches are removed via DB cascade.
     * Only accessible by admin role.
     */
    public function destroy(string $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => "Product {$productId} deleted successfully.",
        ], 200);
    }
}
