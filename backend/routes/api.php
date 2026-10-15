<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\UserController;
use App\Http\Controllers\Api\v1\ProductController;
use App\Http\Controllers\Api\v1\InventoryController;
use App\Http\Controllers\Api\v1\BatchController;
use App\Http\Controllers\Api\v1\SupplierController;
use App\Http\Controllers\Api\v1\OrderTransactionController;
use App\Http\Controllers\Api\v1\ReorderAlertController;

/*
|--------------------------------------------------------------------------
| API Routes — Walang Brownout Appliances Inventory System
| Prefix: /api/v1/
| Auth:   Laravel Sanctum (stateless Bearer token)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // -------------------------------------------------------------------------
    // PUBLIC — Health Check & Deployment Verification
    // -------------------------------------------------------------------------
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'app' => 'Walang Brownout Appliances API',
            'version' => '1.0.0',
            'environment' => app()->environment(),
            'database' => \Illuminate\Support\Facades\DB::connection()->getPdo() ? 'connected' : 'disconnected',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // -------------------------------------------------------------------------
    // PUBLIC — Authentication (no token required)
    // -------------------------------------------------------------------------
    Route::prefix('auth')->group(function () {
        // POST /api/v1/auth/login     → returns Bearer token
        Route::post('/login', [AuthController::class, 'login']);
        // POST /api/v1/auth/register  → registers new user in MySQL
        Route::post('/register', [AuthController::class, 'register']);
    });

    // -------------------------------------------------------------------------
    // PUBLIC READ-ONLY — Products, Inventory, Batches, Suppliers, Transactions
    // (Allows frontend inventory context to seamlessly initialise live MySQL state for all roles)
    // -------------------------------------------------------------------------
    Route::get('/products',                   [ProductController::class, 'index']);
    Route::get('/products/{productId}',       [ProductController::class, 'show']);

    Route::get('/inventory',                  [InventoryController::class, 'index']);
    Route::get('/inventory/{productId}',       [InventoryController::class, 'show']);

    Route::get('/batches/oldest/{productId}', [BatchController::class, 'getOldestAvailable']);
    Route::get('/batches',                    [BatchController::class, 'index']);
    Route::get('/batches/{batchId}',          [BatchController::class, 'show']);

    Route::get('/suppliers',                  [SupplierController::class, 'index']);
    Route::get('/suppliers/{id}',             [SupplierController::class, 'show']);

    Route::get('/transactions',               [OrderTransactionController::class, 'index']);
    Route::get('/transactions/{id}',          [OrderTransactionController::class, 'show']);

    // -------------------------------------------------------------------------
    // PROTECTED — All mutation routes below require a valid Sanctum Bearer token
    // -------------------------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function () {

        // ── Auth ──────────────────────────────────────────────────────────────
        Route::prefix('auth')->group(function () {
            // POST /api/v1/auth/logout  → revokes current token
            Route::post('/logout', [AuthController::class, 'logout']);
            // GET  /api/v1/auth/user    → returns authenticated user profile
            Route::get('/user',   [AuthController::class, 'user']);
        });

        // ── Users (Account Management) ────────────────────────────────────────
        Route::apiResource('users', UserController::class);

        // ── Products Management (Admin/Manager mutations) ─────────────────────
        // POST   /api/v1/products           → create new product + inventory row
        // PUT    /api/v1/products/{id}      → update catalog fields
        // DELETE /api/v1/products/{id}      → delete (cascade to inventory/batches)
        Route::post('/products',               [ProductController::class, 'store']);
        Route::put('/products/{productId}',    [ProductController::class, 'update']);
        Route::delete('/products/{productId}', [ProductController::class, 'destroy']);

        // ── Batches Management ────────────────────────────────────────────────
        Route::prefix('batches')->group(function () {
            Route::post('/',                  [BatchController::class, 'store']);
            Route::delete('/{batchId}',       [BatchController::class, 'destroy']);
        });

        // ── Suppliers Management ──────────────────────────────────────────────
        Route::post('/suppliers',             [SupplierController::class, 'store']);
        Route::put('/suppliers/{id}',          [SupplierController::class, 'update']);
        Route::delete('/suppliers/{id}',       [SupplierController::class, 'destroy']);

        // ── Transactions (Inventory Triggers & Mutations) ─────────────────────
        Route::prefix('transactions')->group(function () {
            Route::post('/commit',  [OrderTransactionController::class, 'commitOrder']);
            Route::post('/pick',    [OrderTransactionController::class, 'pickBarcode']);
            Route::post('/adjust',  [OrderTransactionController::class, 'adjustCount']);
            Route::post('/',        [OrderTransactionController::class, 'store']);
            Route::put('/{id}',     [OrderTransactionController::class, 'update']);
            Route::delete('/{id}',  [OrderTransactionController::class, 'destroy']);
        });

        // ── Alerts ────────────────────────────────────────────────────────────
        // GET /api/v1/alerts/reorder            → all products below ROP threshold
        // GET /api/v1/alerts/reorder/{productId} → single product ROP detail
        // GET /api/v1/alerts/expiry             → batches expiring within N days
        Route::prefix('alerts')->group(function () {
            Route::get('/reorder',             [ReorderAlertController::class, 'getAlerts']);
            Route::get('/reorder/{productId}', [ReorderAlertController::class, 'showProduct']);
            Route::get('/expiry',              [ReorderAlertController::class, 'getExpiryAlerts']);
        });

    }); // end auth:sanctum

}); // end v1 prefix
