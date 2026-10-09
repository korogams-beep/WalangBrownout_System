<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\ProductController;
use App\Http\Controllers\Api\v1\InventoryController;
use App\Http\Controllers\Api\v1\BatchController;
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
    // PUBLIC — Authentication (no token required)
    // -------------------------------------------------------------------------
    Route::prefix('auth')->group(function () {
        // POST /api/v1/auth/login  → returns Bearer token
        Route::post('/login', [AuthController::class, 'login']);
    });

    // -------------------------------------------------------------------------
    // PROTECTED — All routes below require a valid Sanctum Bearer token
    // -------------------------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function () {

        // ── Auth ──────────────────────────────────────────────────────────────
        Route::prefix('auth')->group(function () {
            // POST /api/v1/auth/logout  → revokes current token
            Route::post('/logout', [AuthController::class, 'logout']);
            // GET  /api/v1/auth/user    → returns authenticated user profile
            Route::get('/user',   [AuthController::class, 'user']);
        });

        // ── Products ──────────────────────────────────────────────────────────
        // GET    /api/v1/products           → list all (filterable by class/search)
        // POST   /api/v1/products           → create new product + inventory row
        // GET    /api/v1/products/{id}      → single product with inventory + batches
        // PUT    /api/v1/products/{id}      → update catalog fields
        // DELETE /api/v1/products/{id}      → delete (cascade to inventory/batches)
        Route::apiResource('products', ProductController::class)
             ->parameters(['products' => 'productId']);

        // ── Inventory ─────────────────────────────────────────────────────────
        // GET /api/v1/inventory             → all products with live ATP
        // GET /api/v1/inventory/{productId} → single product ATP status
        Route::prefix('inventory')->group(function () {
            Route::get('/',            [InventoryController::class, 'index']);
            Route::get('/{productId}', [InventoryController::class, 'show']);
        });

        // ── Batches (FIFO Lot Tracking) ───────────────────────────────────────
        // NOTE: getOldestAvailable must be declared BEFORE the {batchId} wildcard
        //       to prevent Laravel matching "oldest" as a batchId param.
        //
        // GET    /api/v1/batches/oldest/{productId} → next FIFO batch to pick
        // GET    /api/v1/batches                    → all batches (filterable)
        // POST   /api/v1/batches                    → receive new lot (RECEIVE trigger)
        // GET    /api/v1/batches/{batchId}           → single batch with history
        // DELETE /api/v1/batches/{batchId}           → delete exhausted batch
        Route::prefix('batches')->group(function () {
            Route::get('/oldest/{productId}', [BatchController::class, 'getOldestAvailable']);
            Route::get('/',                   [BatchController::class, 'index']);
            Route::post('/',                  [BatchController::class, 'store']);
            Route::get('/{batchId}',          [BatchController::class, 'show']);
            Route::delete('/{batchId}',       [BatchController::class, 'destroy']);
        });

        // ── Transactions (Inventory Triggers) ─────────────────────────────────
        // POST /api/v1/transactions/commit  → online checkout reservation (ATP check)
        // POST /api/v1/transactions/pick    → warehouse FIFO barcode scan
        // POST /api/v1/transactions/adjust  → cycle count reconciliation
        // GET  /api/v1/transactions         → paginated audit log (filterable)
        Route::prefix('transactions')->group(function () {
            Route::post('/commit',  [OrderTransactionController::class, 'commitOrder']);
            Route::post('/pick',    [OrderTransactionController::class, 'pickBarcode']);
            Route::post('/adjust',  [OrderTransactionController::class, 'adjustCount']);
            Route::get('/',         [OrderTransactionController::class, 'index']);
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
