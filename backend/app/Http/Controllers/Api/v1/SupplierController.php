<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class SupplierController extends Controller
{
    /**
     * GET /api/v1/suppliers
     * Returns all suppliers from MySQL.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('contact_person', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $suppliers = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data'    => $suppliers,
            'total'   => $suppliers->count(),
        ], 200);
    }

    /**
     * POST /api/v1/suppliers
     * Admin creates a new supplier in MySQL.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id'             => 'nullable|string|max:36|unique:suppliers,id',
            'name'           => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'contactPerson'  => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:50',
            'email'          => 'nullable|email|max:255',
            'address'        => 'nullable|string',
        ]);

        $id = $validated['id'] ?? null;
        if (!$id) {
            $count = Supplier::count() + 1;
            $candidate = 'SUP-' . str_pad((string)$count, 3, '0', STR_PAD_LEFT);
            while (Supplier::where('id', $candidate)->exists()) {
                $count++;
                $candidate = 'SUP-' . str_pad((string)$count, 3, '0', STR_PAD_LEFT);
            }
            $id = $candidate;
        }

        $supplier = Supplier::create([
            'id'             => $id,
            'name'           => $validated['name'],
            'contact_person' => $validated['contact_person'] ?? $validated['contactPerson'] ?? null,
            'phone'          => $validated['phone'] ?? null,
            'email'          => $validated['email'] ?? null,
            'address'        => $validated['address'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Supplier created successfully.',
            'data'    => $supplier,
        ], 201);
    }

    /**
     * GET /api/v1/suppliers/{id}
     */
    public function show(string $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $supplier,
        ], 200);
    }

    /**
     * PUT /api/v1/suppliers/{id}
     * Admin / Manager updates supplier info in MySQL.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'contactPerson'  => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:50',
            'email'          => 'nullable|email|max:255',
            'address'        => 'nullable|string',
        ]);

        if (array_key_exists('contactPerson', $validated) && !array_key_exists('contact_person', $validated)) {
            $validated['contact_person'] = $validated['contactPerson'];
        }
        unset($validated['contactPerson']);

        $supplier->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier updated successfully.',
            'data'    => $supplier,
        ], 200);
    }

    /**
     * DELETE /api/v1/suppliers/{id}
     * Admin deletes a supplier from MySQL.
     */
    public function destroy(string $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => "Supplier {$id} deleted successfully.",
        ], 200);
    }
}
