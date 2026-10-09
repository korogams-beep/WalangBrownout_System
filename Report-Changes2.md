# Walang Brownout Appliances: Real-Time Inventory Control System
## Complete Backend Architecture, REST API Engineering, Railway Deployment & Task Distribution Guide
**Subject:** CCS112 – Applications Development and Emerging Technologies  
**Institution:** Pamantasan ng Cabuyao (University of Cabuyao) – College of Computing Studies  
**System Target:** Decoupled Architecture (React SPA + Laravel 11 REST API + MySQL on Railway)

---

## 1. Executive Summary & Monorepo Restructuring

Walang Brownout Appliances requires transitioning from a weekly manual spreadsheet tracking model to an automated, real-time relational inventory platform. Based on the approved Case Study Blueprint, the system must permanently resolve three critical operational failures:
1. **The Summer Crunch:** Prevent Portable AC unit stockouts in June and costly off-season overstock in winter via dynamic Seasonal Reorder Points ($ROP$).
2. **The Mystery Shrinkage:** Eliminate phantom inventory sales by calculating Available-to-Promise ($\text{ATP} = \text{QuantityOnHand} - \text{QuantityCommitted}$) and executing atomic transactions across online and warehouse channels.
3. **The Expiry Trap:** Prevent degradation of Class C carbon replacement filters (9-month shelf life) using automated First-In, First-Out (FIFO) digital batch tracking and bin allocation.

### 1.1 Target Technology Stack

* **Frontend:** React (Vite), React Router DOM, Tailwind CSS (Single Page Application, strictly decoupled; **no Inertia.js**).
* **Backend:** Laravel 11 (PHP 8.2+) configured strictly as a stateless RESTful JSON API.
* **Database:** MySQL 8.0 with InnoDB engine enforcing ACID transactional integrity.
* **Database Management:** phpMyAdmin hosted on Railway linked directly to the production MySQL instance.
* **Cloud Platform:** Railway (PaaS) hosting the backend container/nixpacks service, frontend static service, MySQL database, and phpMyAdmin.

---

### 1.2 Repository Reorganization (Monorepo Layout)

To maintain a clean workflow, the single repository (`WalangBrownout_System`) will be restructured into two independent root directories: `/frontend` and `/backend`.

```
WalangBrownout_System/
├── .github/
│   └── workflows/              # Optional CI/CD pipelines
├── frontend/                   # Your existing React + Vite SPA
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/         # Shared UI (Navbar, Sidebar, Modals, Cards)
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── hooks/              # Custom hooks (useInventory, useAuth)
│   │   ├── pages/              # React Router Views (Dashboard, Inventory, Scanner, Orders)
│   │   ├── services/           # Axios API client configurations & endpoints
│   │   ├── App.jsx             # React Router DOM route hierarchy
│   │   ├── index.css           # Tailwind CSS directives
│   │   └── main.jsx            # Entry point with BrowserRouter
│   ├── .env.development        # VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
│   ├── .env.production         # VITE_API_BASE_URL=https://backend-production.up.railway.app/api/v1
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/                    # Newly scaffolded Laravel REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/v1/ # RESTful API Controllers
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── ProductController.php
│   │   │   │   ├── InventoryController.php
│   │   │   │   ├── BatchController.php
│   │   │   │   ├── OrderTransactionController.php
│   │   │   │   └── ReorderAlertController.php
│   │   │   ├── Middleware/     # JSON response headers, Role verification
│   │   │   └── Requests/       # Form Request Validation classes (RFC 7807)
│   │   ├── Models/             # Eloquent Models (Product, Inventory, Batch, Transaction)
│   │   └── Services/           # Domain logic (FifoPickingService, RopCalculationService)
│   ├── bootstrap/
│   │   └── app.php             # Laravel 11 routing, exception handling, and middleware
│   ├── config/
│   │   ├── cors.php            # Cross-Origin Resource Sharing settings
│   │   ├── database.php
│   │   └── sanctum.php
│   ├── database/
│   │   ├── migrations/         # Normalized MySQL Schema
│   │   └── seeders/            # Initial Class A, B, C catalog & user seeds
│   ├── routes/
│   │   ├── api.php             # Resource-oriented versioned routes (/api/v1/...)
│   │   └── console.php
│   ├── .env.example
│   ├── composer.json
│   ├── Procfile                # Railway deployment process descriptor
│   └── nixpacks.toml           # Deployment build configuration
├── .gitignore                  # Combined gitignore (ignoring node_modules, /backend/vendor)
└── README.md
```

#### Step-by-Step Monorepo Migration Commands:
Run these commands in your local Git terminal:

```bash
# 1. Clone repository locally if not already done
git clone https://github.com/korogams-beep/WalangBrownout_System.git
cd WalangBrownout_System

# 2. Create the frontend directory and move all existing React files into it
mkdir frontend
# Move existing UI files (Windows PowerShell)
Get-ChildItem -Exclude frontend, .git | Move-Item -Destination frontend
# (Or on Linux/macOS Bash: mv `ls -A | grep -vE 'frontend|\.git'` frontend/)

# 3. Create the Laravel backend inside /backend
composer create-project laravel/laravel backend

# 4. Update the root .gitignore to handle both ecosystems
cat <<EOT >> .gitignore
# Frontend ignores
frontend/node_modules/
frontend/dist/
frontend/.env.local

# Backend ignores
backend/vendor/
backend/.env
backend/storage/*.key
backend/public/storage
EOT

# 5. Commit directory restructuring
git add .
git commit -m "refactor: restructure repository into /frontend and /backend monorepo"
```

---

## 2. Relational Database Architecture & Business Logic (MySQL)

As specified in Section II of the Case Study Blueprint, the MySQL database replaces the shared spreadsheet with an atomic relational schema.

### 2.1 Entity Relationship Model

```
+--------------------+            +------------------------+
|      PRODUCTS      | 1        1 |       INVENTORY        |
+--------------------+------------+------------------------+
| PK product_id      |            | PK,FK product_id       |
|    name            |            |    quantity_on_hand    |
|    sku             |            |    quantity_committed  |
|    class (A, B, C) |            |    unit_cost           |
|    is_perishable   |            |    created_at / up...  |
|    is_seasonal     |            +------------------------+
|    shelf_life_days |
+---------+----------+
          | 1
          |
          | *
+---------+----------+            +------------------------+
|      BATCHES       | 1        * |      TRANSACTIONS      |
+--------------------+------------+------------------------+
| PK batch_id        |            | PK transaction_id      |
| FK product_id      |            | FK product_id          |
|    batch_number    |            | FK batch_id (nullable) |
|    date_received   |            | FK user_id             |
|    expiry_date     |            |    type (ENUM)         |
|    quantity_remains|            |    quantity_changed    |
|    bin_location    |            |    reference_number    |
+--------------------+            |    notes               |
                                  |    created_at          |
                                  +------------------------+
```

### 2.2 Laravel Migrations

#### `database/migrations/2026_01_01_000001_create_products_table.php`
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('products', function (Blueprint $table) {
            $table->string('product_id', 36)->primary(); // e.g., AC-PORT-01, FILT-HEPA-01
            $table->string('name');
            $table->string('sku')->unique();
            $table->enum('abc_class', ['A', 'B', 'C'])->comment('A: High Value/Seasonal, B: Moderate, C: Low Value/Perishable');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('unit_cost', 10, 2);
            $table->boolean('is_perishable')->default(false);
            $table->boolean('is_seasonal')->default(false);
            $table->integer('shelf_life_days')->nullable()->comment('270 days for Class C Carbon Filters');
            $table->integer('supplier_lead_time_days')->default(14);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('products');
    }
};
```

#### `database/migrations/2026_01_01_000002_create_inventories_table.php`
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('inventories', function (Blueprint $table) {
            $table->string('product_id', 36)->primary();
            $table->foreign('product_id')->references('product_id')->on('products')->onDelete('cascade');
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('quantity_committed')->default(0);
            $table->integer('safety_stock')->default(10);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('inventories');
    }
};
```

#### `database/migrations/2026_01_01_000003_create_batches_table.php`
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('batches', function (Blueprint $table) {
            $table->string('batch_id', 36)->primary();
            $table->string('product_id', 36);
            $table->foreign('product_id')->references('product_id')->on('products')->onDelete('cascade');
            $table->string('batch_number')->unique();
            $table->date('date_received');
            $table->date('expiry_date')->nullable()->index();
            $table->integer('quantity_received');
            $table->integer('quantity_remains');
            $table->string('bin_location', 50)->comment('Gravity rack code e.g., RACK-C-01');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('batches');
    }
};
```

#### `database/migrations/2026_01_01_000004_create_transactions_table.php`
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('transaction_id')->primary();
            $table->string('product_id', 36);
            $table->foreign('product_id')->references('product_id')->on('products')->onDelete('cascade');
            $table->string('batch_id', 36)->nullable();
            $table->foreign('batch_id')->references('batch_id')->on('batches')->onDelete('set null');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('transaction_type', ['RECEIVE', 'COMMIT', 'PICK', 'ADJUST']);
            $table->integer('quantity_changed');
            $table->string('reference_number')->nullable()->comment('Order ID, Audit ID, or PO ID');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['product_id', 'transaction_type']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('transactions');
    }
};
```

---

### 2.3 Mathematical Core Implementations

#### 1. Available to Promise (ATP)
To permanently eliminate "Mystery Shrinkage" where physical stock diverges from e-commerce checkouts:
$$\text{ATP} = \text{QuantityOnHand} - \text{QuantityCommitted}$$

#### 2. Non-Seasonal Reorder Point ($ROP$)
Applied to Smart Thermostats and Air Purifiers:
$$ROP = (d \times LT) + SS$$
Where:
* $d$ = Average Daily Demand ($\text{Annual Demand} / 365$)
* $LT$ = Supplier Lead Time in days
* $SS$ = Safety Stock buffer:
$$SS = (d_{max} \times LT_{max}) - (d_{avg} \times LT_{avg})$$

#### 3. Seasonal Reorder Point ($ROP_{seasonal}$)
Applied to Portable AC Units to eliminate the "Summer Crunch" and winter storage overstock:
$$SI_m = \frac{\bar{D}_m}{\bar{D}_{monthly\_avg}}$$
$$d_{seasonal} = \left(\frac{D_{annual\_base}}{365}\right) \times SI_m$$
$$ROP_{seasonal} = (d_{seasonal} \times LT) + SS_{seasonal}$$

#### 4. FIFO Picking Enforcement (Carbon Filters)
When an item is perishable (`is_perishable = TRUE`), the picking logic must query:
```sql
SELECT batch_id, bin_location, quantity_remains, expiry_date
FROM batches
WHERE product_id = ? AND quantity_remains > 0
ORDER BY expiry_date ASC, date_received ASC
LIMIT 1;
```
If warehouse personnel scan a barcode belonging to a newer batch while an older unexpired batch has `quantity_remains > 0`, the API must reject the transaction with a `422 Unprocessable Entity` validation conflict.

---

## 3. Backend API Implementation (Laravel 11 RESTful Architecture)

### 3.1 CORS & API Configuration

Ensure the React frontend running on Vite (`http://localhost:5173`) or Railway production can consume endpoints with headers and credentials.

#### `backend/config/cors.php`
```php
<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:5173',
        'https://walangbrownoutui.vercel.app',
        env('FRONTEND_URL', 'http://localhost:5173'),
    ],
    'allowed_origins_patterns' => ['*.railway.app'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

In Laravel 11, install API routing and Laravel Sanctum:
```bash
cd backend
php artisan install:api
```

### 3.2 Standardized RFC 7807 Error Handling
As required in CCS112 Final Module 1, Lab 2, every validation failure must return a uniform JSON error envelope rather than standard HTML redirects.

Configure `backend/bootstrap/app.php`:
```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code' => 'VALIDATION_FAILED',
                        'message' => 'The provided transaction payload was invalid.',
                        'fields' => $e->errors(),
                    ]
                ], 422);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code' => 'RESOURCE_NOT_FOUND',
                        'message' => 'The requested inventory or batch resource does not exist.',
                    ]
                ], 404);
            }
        });
    })->create();
```

---

### 3.3 Core Eloquent Models

#### `backend/app/Models/Product.php`
```php
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
    ];

    protected $casts = [
        'is_perishable' => 'boolean',
        'is_seasonal' => 'boolean',
        'unit_price' => 'decimal:2',
        'unit_cost' => 'decimal:2',
    ];

    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class, 'product_id', 'product_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class, 'product_id', 'product_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'product_id', 'product_id');
    }
}
```

#### `backend/app/Models/Inventory.php`
```php
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

    protected $appends = ['available_to_promise'];

    // ATP Formula: QuantityOnHand - QuantityCommitted
    public function getAvailableToPromiseAttribute(): int
    {
        return max(0, $this->quantity_on_hand - $this->quantity_committed);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
```

#### `backend/app/Models/Batch.php`
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'date_received' => 'date',
        'expiry_date' => 'date',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
```

#### `backend/app/Models/Transaction.php`
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

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
}
```

---

### 3.4 Business Logic Services (FIFO & ROP)

#### `backend/app/Services/InventoryService.php`
This service encapsulates the 3 real-time triggers using strict `DB::transaction` executions to ensure ACID compliance:

```php
<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Batch;
use App\Models\Transaction;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Exception;

class InventoryService
{
    /**
     * Trigger 1: COMMIT (Online Checkout)
     * Increments committed quantity and reduces ATP immediately.
     */
    public function executeCommit(string $productId, int $quantity, int $userId, string $orderRef): Transaction
    {
        return DB::transaction(function () use ($productId, $quantity, $userId, $orderRef) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrFail();

            if ($inventory->available_to_promise < $quantity) {
                throw new Exception("ATP_INSUFFICIENT: Requested {$quantity}, but Available-to-Promise is only {$inventory->available_to_promise}");
            }

            $inventory->increment('quantity_committed', $quantity);

            return Transaction::create([
                'product_id' => $productId,
                'user_id' => $userId,
                'transaction_type' => 'COMMIT',
                'quantity_changed' => $quantity,
                'reference_number' => $orderRef,
                'notes' => 'E-commerce checkout commitment reserved.',
            ]);
        });
    }

    /**
     * Trigger 2: PICK (Barcode Scan & FIFO Lot Routing)
     * Decrements on-hand, decrements committed, and exhausts oldest batch.
     */
    public function executePick(string $productId, string $scannedBatchId, int $quantity, int $userId, string $orderRef): Transaction
    {
        return DB::transaction(function () use ($productId, $scannedBatchId, $quantity, $userId, $orderRef) {
            $product = Product::findOrFail($productId);
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrFail();
            $scannedBatch = Batch::where('batch_id', $scannedBatchId)->lockForUpdate()->firstOrFail();

            // Strict FIFO Check for Perishable Replacement Filters
            if ($product->is_perishable) {
                $oldestBatch = Batch::where('product_id', $productId)
                    ->where('quantity_remains', '>', 0)
                    ->orderBy('expiry_date', 'asc')
                    ->orderBy('date_received', 'asc')
                    ->first();

                if ($oldestBatch && $oldestBatch->batch_id !== $scannedBatchId) {
                    throw new Exception("FIFO_VIOLATION: Batch {$oldestBatch->batch_number} at bin {$oldestBatch->bin_location} must be picked first.");
                }
            }

            if ($scannedBatch->quantity_remains < $quantity) {
                throw new Exception("BATCH_EXHAUSTED: Scanned batch only contains {$scannedBatch->quantity_remains} units.");
            }

            // Decrement batch allocation
            $scannedBatch->decrement('quantity_remains', $quantity);

            // Decrement physical stock and resolve reservation
            $inventory->decrement('quantity_on_hand', $quantity);
            $inventory->decrement('quantity_committed', $quantity);

            return Transaction::create([
                'product_id' => $productId,
                'batch_id' => $scannedBatchId,
                'user_id' => $userId,
                'transaction_type' => 'PICK',
                'quantity_changed' => -$quantity,
                'reference_number' => $orderRef,
                'notes' => "Barcode verified pick completed from {$scannedBatch->bin_location}.",
            ]);
        });
    }

    /**
     * Trigger 3: ADJUST (Audit Cycle Count Reconciliation)
     */
    public function executeAdjust(string $productId, int $actualPhysicalCount, int $userId, string $reason): Transaction
    {
        return DB::transaction(function () use ($productId, $actualPhysicalCount, $userId, $reason) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->firstOrFail();
            $variance = $actualPhysicalCount - $inventory->quantity_on_hand;

            $inventory->update(['quantity_on_hand' => $actualPhysicalCount]);

            return Transaction::create([
                'product_id' => $productId,
                'user_id' => $userId,
                'transaction_type' => 'ADJUST',
                'quantity_changed' => $variance,
                'notes' => "Cycle audit adjustment. Reason: {$reason}. Variance: {$variance}",
            ]);
        });
    }
}
```

---

### 3.5 Reorder Point (ROP) Service

#### `backend/app/Services/RopService.php`
```php
<?php

namespace App\Services;

use App\Models\Product;

class RopService
{
    // Monthly Seasonal Indices for Portable ACs (Base Peak = June)
    private array $seasonalIndices = [
        1 => 0.3,  2 => 0.4,  3 => 1.2,  4 => 2.4,  5 => 2.8,  6 => 3.2,
        7 => 1.8,  8 => 0.8,  9 => 0.3, 10 => 0.2, 11 => 0.2, 12 => 0.3
    ];

    public function calculateRop(Product $product, int $currentMonth = 5): array
    {
        $leadTime = $product->supplier_lead_time_days;
        $inventory = $product->inventory;

        if ($product->is_seasonal) {
            $baseAnnualDemand = 5475; // 15 units/day base simulation
            $dailyBaseDemand = $baseAnnualDemand / 365;
            $si = $this->seasonalIndices[$currentMonth] ?? 1.0;
            $dSeasonal = $dailyBaseDemand * $si;
            $safetyStock = ($si > 1.5) ? 50 : 15;

            $rop = ($dSeasonal * $leadTime) + $safetyStock;

            return [
                'type' => 'SEASONAL',
                'current_month' => $currentMonth,
                'seasonal_index' => $si,
                'adjusted_daily_demand' => round($dSeasonal, 2),
                'safety_stock' => $safetyStock,
                'reorder_point' => (int) ceil($rop),
                'available_to_promise' => $inventory->available_to_promise,
                'needs_reorder' => $inventory->available_to_promise <= $rop,
            ];
        }

        // Non-Seasonal Standard ROP
        $dailyDemand = 2; // Flat 2 units/day e.g., Thermostat
        $safetyStock = $inventory->safety_stock ?? 10;
        $rop = ($dailyDemand * $leadTime) + $safetyStock;

        return [
            'type' => 'NON_SEASONAL',
            'daily_demand' => $dailyDemand,
            'lead_time_days' => $leadTime,
            'safety_stock' => $safetyStock,
            'reorder_point' => (int) ceil($rop),
            'available_to_promise' => $inventory->available_to_promise,
            'needs_reorder' => $inventory->available_to_promise <= $rop,
        ];
    }
}
```

---

### 3.6 API Routes & Controllers

#### `backend/routes/api.php`
```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\ProductController;
use App\Http\Controllers\Api\v1\InventoryController;
use App\Http\Controllers\Api\v1\BatchController;
use App\Http\Controllers\Api\v1\OrderTransactionController;
use App\Http\Controllers\Api\v1\ReorderAlertController;

Route::prefix('v1')->group(function () {
    // Public Authentication
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Protected Routes (Sanctum Bearer Token)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/user', [AuthController::class, 'user']);

        // Products & Inventory
        Route::apiResource('products', ProductController::class);
        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::get('/inventory/{productId}', [InventoryController::class, 'show']);

        // Batches (FIFO & Lots)
        Route::get('/batches/oldest/{productId}', [BatchController::class, 'getOldestAvailable']);
        Route::apiResource('batches', BatchController::class);

        // Transaction Triggers
        Route::post('/transactions/commit', [OrderTransactionController::class, 'commitOrder']);
        Route::post('/transactions/pick', [OrderTransactionController::class, 'pickBarcode']);
        Route::post('/transactions/adjust', [OrderTransactionController::class, 'adjustCount']);
        Route::get('/transactions', [OrderTransactionController::class, 'index']);

        // Operational Alerts
        Route::get('/alerts/reorder', [ReorderAlertController::class, 'getAlerts']);
    });
});
```

#### `backend/app/Http/Controllers/Api/v1/OrderTransactionController.php`
```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\InventoryService;
use Exception;

class OrderTransactionController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function commitOrder(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|string|exists:products,product_id',
            'quantity' => 'required|integer|min:1',
            'order_reference' => 'required|string|max:50',
        ]);

        try {
            $transaction = $this->inventoryService->executeCommit(
                $validated['product_id'],
                $validated['quantity'],
                $request->user()->id,
                $validated['order_reference']
            );

            return response()->json([
                'success' => true,
                'message' => 'Inventory committed successfully. ATP decremented.',
                'transaction' => $transaction,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'TRANSACTION_REJECTED',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }

    public function pickBarcode(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|string|exists:products,product_id',
            'scanned_batch_id' => 'required|string|exists:batches,batch_id',
            'quantity' => 'required|integer|min:1',
            'order_reference' => 'required|string|max:50',
        ]);

        try {
            $transaction = $this->inventoryService->executePick(
                $validated['product_id'],
                $validated['scanned_batch_id'],
                $validated['quantity'],
                $request->user()->id,
                $validated['order_reference']
            );

            return response()->json([
                'success' => true,
                'message' => 'Pick executed successfully. Stock and commitment updated.',
                'transaction' => $transaction,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'error' => [
                    'code' => 'FIFO_SCAN_ERROR',
                    'message' => $e->getMessage(),
                ]
            ], 422);
        }
    }

    public function adjustCount(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|string|exists:products,product_id',
            'actual_physical_count' => 'required|integer|min:0',
            'reason' => 'required|string|max:255',
        ]);

        $transaction = $this->inventoryService->executeAdjust(
            $validated['product_id'],
            $validated['actual_physical_count'],
            $request->user()->id,
            $validated['reason']
        );

        return response()->json([
            'success' => true,
            'message' => 'Physical cycle adjustment logged successfully.',
            'transaction' => $transaction,
        ], 200);
    }
}
```

---

## 4. Frontend Integration (React + React Router DOM)

Your frontend remains completely decoupled using **React Router DOM** and **Axios** (no Inertia).

### 4.1 Axios Central API Client

Create `frontend/src/services/api.js`:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach Bearer Token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor for session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('wb_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4.2 Barcode FIFO Scanning Integration Component

Create `frontend/src/pages/BarcodeScanner.jsx` to demonstrate direct interaction with Trigger 2:

```jsx
import React, { useState } from 'react';
import api from '../services/api';

export default function BarcodeScanner() {
  const [productId, setProductId] = useState('');
  const [scannedBatchId, setScannedBatchId] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const response = await api.post('/transactions/pick', {
        product_id: productId,
        scanned_batch_id: scannedBatchId,
        quantity: 1,
        order_reference: orderRef,
      });

      setFeedback({
        type: 'success',
        message: `Success: Pick confirmed for batch ${scannedBatchId}. Inventory updated.`,
      });
      setScannedBatchId('');
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Pick verification failed.';
      setFeedback({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Warehouse Digital FIFO Picking Scanner</h2>
      <p className="text-sm text-gray-500">
        Class C Replacement Filters require oldest batch picking. The scanner will reject newer batches.
      </p>

      {feedback && (
        <div className={`p-4 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handlePickSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Product SKU / Code</label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="e.g. FILT-CARBON-01"
            required
            className="w-full mt-1 border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Scan Batch Barcode</label>
          <input
            type="text"
            value={scannedBatchId}
            onChange={(e) => setScannedBatchId(e.target.value)}
            placeholder="Scan Lot ID e.g. BATCH-2026-004"
            required
            className="w-full mt-1 border border-gray-300 rounded px-3 py-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Order Reference #</label>
          <input
            type="text"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="e.g. ORD-9821"
            required
            className="w-full mt-1 border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          {loading ? 'Validating Batch...' : 'Confirm Physical Pick'}
        </button>
      </form>
    </div>
  );
}
```

---

## 5. Railway Cloud Infrastructure & Deployment Guide

This section replaces Vercel with a unified **Railway** infrastructure hosting MySQL, phpMyAdmin, the Laravel API, and the React frontend.

```
+-----------------------------------------------------------------+
|                       RAILWAY PROJECT                           |
|                                                                 |
|   +-------------------+              +----------------------+   |
|   |   MySQL Service   |<-------------|   phpMyAdmin Service |   |
|   |   (Database)      |              |   (GUI Web Client)   |   |
|   +---------^---------+              +----------------------+   |
|             | (Private Network)                                 |
|             |                                                   |
|   +---------+---------+              +----------------------+   |
|   |  Laravel REST API |<-------------|  React SPA (Vite)    |   |
|   |  (Backend Service)|  (HTTPS REST)|  (Frontend Service)  |   |
|   +-------------------+              +----------------------+   |
+-----------------------------------------------------------------+
```

### 5.1 Step 1: Provisioning MySQL on Railway
1. Log in to [railway.app](https://railway.app).
2. Click **New Project** $\rightarrow$ **Provision MySQL**.
3. Railway automatically creates the database and exposes variables:
   * `MYSQLHOST`
   * `MYSQLPORT`
   * `MYSQLUSER`
   * `MYSQLPASSWORD`
   * `MYSQLDATABASE`
   * `MYSQL_URL`

---

### 5.2 Step 2: Deploying phpMyAdmin on Railway
To view and manage the MySQL database via a browser GUI:
1. In the same Railway project canvas, click **Create** $\rightarrow$ **Docker Image**.
2. Enter the official Docker image: `phpmyadmin:latest` (or `phpmyadmin`).
3. Once the service appears, go to **Variables** $\rightarrow$ **Add Variable Reference**:
   * `PMA_HOST`: `${{MySQL.MYSQLHOST}}`
   * `PMA_PORT`: `${{MySQL.MYSQLPORT}}`
   * `PMA_USER`: `${{MySQL.MYSQLUSER}}`
   * `PMA_PASSWORD`: `${{MySQL.MYSQLPASSWORD}}`
   * `UPLOAD_LIMIT`: `64M`
4. Go to **Settings** $\rightarrow$ **Public Networking** $\rightarrow$ click **Generate Domain**.
5. Open the generated domain URL. You will see phpMyAdmin logged into your Railway MySQL instance.

---

### 5.3 Step 3: Deploying the Laravel Backend on Railway
1. In your project canvas, click **Create** $\rightarrow$ **GitHub Repo** $\rightarrow$ select `korogams-beep/WalangBrownout_System`.
2. Go to **Settings** $\rightarrow$ **General**:
   * **Root Directory:** Set to `/backend`.
3. Create `backend/Procfile` to instruct Railway how to serve the API:
   ```procfile
   web: php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan serve --host=0.0.0.0 --port=$PORT
   ```
4. Set the following **Variables** in the Backend service:
   * `APP_NAME`: `WalangBrownout_Backend`
   * `APP_ENV`: `production`
   * `APP_KEY`: *(Generate via `php artisan key:generate --show` and paste here)*
   * `APP_DEBUG`: `false`
   * `APP_URL`: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
   * `DB_CONNECTION`: `mysql`
   * `DB_HOST`: `${{MySQL.MYSQLHOST}}`
   * `DB_PORT`: `${{MySQL.MYSQLPORT}}`
   * `DB_DATABASE`: `${{MySQL.MYSQLDATABASE}}`
   * `DB_USERNAME`: `${{MySQL.MYSQLUSER}}`
   * `DB_PASSWORD`: `${{MySQL.MYSQLPASSWORD}}`
   * `FRONTEND_URL`: `https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}`
5. Go to **Settings** $\rightarrow$ **Networking** $\rightarrow$ click **Generate Domain** (e.g., `walangbrownout-backend.up.railway.app`).

---

### 5.4 Step 4: Deploying the React Frontend on Railway
1. Click **Create** $\rightarrow$ **GitHub Repo** $\rightarrow$ select `korogams-beep/WalangBrownout_System`.
2. Go to **Settings** $\rightarrow$ **General**:
   * **Root Directory:** Set to `/frontend`.
3. Create `frontend/nixpacks.toml` to handle Vite building and single-page routing:
   ```toml
   [phases.build]
   cmds = ["npm install", "npm run build"]

   [start]
   cmd = "npx serve -s dist -l $PORT"
   ```
4. Add Environment Variable:
   * `VITE_API_BASE_URL`: `https://walangbrownout-backend.up.railway.app/api/v1`
5. Go to **Networking** $\rightarrow$ **Generate Domain**.
6. Verify in the browser that React Router navigation, authentication, and inventory views function without 404 refresh errors.

---

## 6. Team Task Distribution (4 Members)

Based on the 4 authors from the Pamantasan ng Cabuyao CCS112 Case Study Blueprint, tasks are distributed evenly across Database/Logic, API/Security, DevOps/Cloud, and Frontend Integration.

```
+-----------------------------------------------------------------------------------+
|                            GROUP TASK ALLOCATION MATRIX                           |
+------------------------------+----------------------------------------------------+
| Member & Primary Role        | Core Responsibilities                             |
+------------------------------+----------------------------------------------------+
| 1. Facistol, Eazra Eliel R.  | • MySQL Schema Migrations & Constraints           |
|    Database Engineer &       | • InventoryService (3 Triggers: COMMIT, PICK, ADJ) |
|    Business Logic Lead       | • ROP Mathematical Service & FIFO Query Engine     |
+------------------------------+----------------------------------------------------+
| 2. Gamalo, Brent Harold R.   | • Laravel 11 REST API Controllers & Routes         |
|    Backend API & Security    | • RFC 7807 Standardized Exception Handling         |
|    Engineer                  | • Laravel Sanctum Auth & CORS Middleware Config    |
+------------------------------+----------------------------------------------------+
| 3. Guevarra, Jan Emerson C.  | • Railway Project Setup (MySQL, phpMyAdmin, Apps)  |
|    DevOps & Cloud Engineer   | • Monorepo Restructuring & Railway Build Configs   |
|                              | • Database Seeder (Class A/B/C) & Postman Testing  |
+------------------------------+----------------------------------------------------+
| 4. Intia, Ais B.             | • React Axios Client & Interceptors                |
|    Frontend Integration &    | • Connecting UI to /api/v1 (Auth, Stock, Alerts)   |
|    State Lead                | • Barcode FIFO Scanner UI & Real-Time ATP Views    |
+------------------------------+----------------------------------------------------+
```

### Member 1: Facistol, Eazra Eliel R.
**Primary Role:** Database Engineer & Business Logic Architect  
**Deliverables:**
1. Author and test the 4 MySQL migration files (`products`, `inventories`, `batches`, `transactions`) with strict Foreign Key constraints and field indexing.
2. Implement `App\Services\InventoryService.php` enforcing ACID transactions via `DB::transaction()` for:
   * **COMMIT Trigger:** Atomically decrementing ATP on order reservations.
   * **PICK Trigger:** Validating batch barcodes and decrementing `quantity_on_hand` and `quantity_remains`.
   * **ADJUST Trigger:** Cycle count reconciliation logging adjustments with forensic audit notes.
3. Code `App\Services\RopService.php` calculating monthly dynamic Seasonal Indices ($SI_m$) for Portable AC units and flat ROP for Class B and C products.
4. Implement the strict FIFO batch query ordering by `expiry_date ASC` and `date_received ASC` to reject out-of-order Class C filter picking.

### Member 2: Gamalo, Brent Harold R.
**Primary Role:** Backend API & Security Engineer  
**Deliverables:**
1. Configure `routes/api.php` under the `/api/v1/` prefix with clean RESTful resource controllers.
2. Develop `OrderTransactionController.php`, `InventoryController.php`, `BatchController.php`, and `ProductController.php`.
3. Implement Laravel Sanctum stateless API token authentication (`login`, `logout`, `user`).
4. Implement RFC 7807 standard validation error formatting in `bootstrap/app.php` ensuring that all validation and model-not-found exceptions return structured JSON payloads with machine-readable error codes.
5. Configure `config/cors.php` ensuring allowed origins support both local Vite development and deployed Railway URLs.

### Member 3: Guevarra, Jan Emerson C.
**Primary Role:** DevOps & Cloud Infrastructure Lead  
**Deliverables:**
1. Restructure the Git repository into `/frontend` and `/backend` and configure root `.gitignore`.
2. Provision and manage the Railway environment:
   * Provision the MySQL database service.
   * Deploy and configure the `phpmyadmin` container linked via Railway private networking.
   * Configure Railway deployment settings for the Laravel backend (`Procfile`, `nixpacks.toml`, PHP 8.2 extensions).
3. Populate `DatabaseSeeder.php` with initial datasets based on the case study:
   * Portable AC Units (Class A, Seasonal).
   * Smart Thermostats (Class A, High-Value).
   * Air Purifiers (Class B, Non-Seasonal).
   * Replacement Carbon Filters (Class C, Perishable, 270-day shelf life).
4. Conduct automated endpoint verification via Postman/cURL, testing database persistence and rollback handling as required in Final Handout Lab 3.

### Member 4: Intia, Ais B.
**Primary Role:** Frontend Integration & State Lead  
**Deliverables:**
1. Setup Axios API client (`src/services/api.js`) with request/response interceptors to attach Sanctum Bearer tokens and handle 401 unauthenticated redirects.
2. Integrate the existing React Router DOM pages with the Laravel API:
   * **Dashboard & Inventory Views:** Replace mock data with live `/api/v1/inventory` requests displaying computed `available_to_promise`.
   * **Barcode Scanner View:** Connect warehouse scan form to `/api/v1/transactions/pick`, rendering UI error banners when FIFO picking violations occur.
   * **Reorder Point Alerts Page:** Display live warning badges when $\text{ATP} \le ROP$.
3. Configure environment variables in `frontend/.env.development` and `frontend/.env.production`.
4. Validate that the React SPA build functions on Railway with client-side routing rewrites (`serve -s dist`).

---

## 7. Step-by-Step Implementation Roadmap

```
WEEK 1: Foundation & Restructure
[DevOps] Restructure repository into /frontend and /backend
[DevOps] Provision MySQL & phpMyAdmin on Railway
[DB Lead] Run Laravel migrations & seeders locally and on Railway MySQL

WEEK 2: Core Services & REST API Development
[DB Lead] Implement InventoryService (COMMIT, PICK, ADJUST triggers) & RopService
[API Lead] Build Laravel REST API controllers, Sanctum auth, and RFC 7807 handlers
[Frontend] Configure Axios client with Bearer Token interceptors

WEEK 3: Integration & Testing
[Frontend] Wire up Barcode Scanner, Inventory table, and Alerts to Laravel API
[API Lead] Refine CORS headers, validation rules, and error envelopes
[DevOps] Postman stress testing of concurrent inventory commits & rollbacks

WEEK 4: Railway Final Deployment & Audit
[DevOps] Deploy Backend & Frontend services to Railway
[All Members] Execute real-world scenario tests:
  1. Trigger COMMIT: Confirm ATP drops immediately online.
  2. Trigger PICK with wrong filter lot: Confirm FIFO validation blocks pick.
  3. Verify phpMyAdmin shows audit trails in transactions table.
```

By following this guide, Walang Brownout Appliances will successfully transition from its legacy spreadsheet to a reliable, cloud-hosted real-time inventory management platform.