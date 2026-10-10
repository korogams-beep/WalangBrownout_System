# System Issues & Technical Debt Registry

**Project:** Walang Brownout Appliances — Inventory Control System  
**Subject:** CCS112 – Applications Development and Emerging Technologies  
**Institution:** Pamantasan ng Cabuyao (University of Cabuyao) – College of Computing Studies  
**Document Purpose:** Living tracker for architectural gaps, configuration bugs, schema mismatches, and deployment risks across the frontend (React SPA) and backend (Laravel REST API). Update this file whenever new issues are identified or existing ones are resolved.

---

## Issue Status Matrix

| ID | Issue Title | Category | Severity | Status |
| :--- | :--- | :--- | :---: | :---: |
| **ISSUE-001** | Frontend Still Dependent on Static Mock Data | Architecture / Integration | **High** | Open |
| **ISSUE-002** | User Role Enum Mismatch (`manager` in Frontend vs Backend) | Database / Schema | **High** | Open |
| **ISSUE-003** | Product ID Format Discrepancy (`PID-` vs `AC-PORT-` / `FILT-`) | Data Modeling | **Medium** | Open |
| **ISSUE-004** | Railway Nixpacks Non-Interactive Hanging Bug (`npx serve`) | Cloud / Deployment | **High** | Open |
| **ISSUE-005** | Build-Phase Configuration Caching on Railway | Cloud / Deployment | **High** | Open |
| **ISSUE-006** | Single-Threaded Development Server in Production Procfile | Infrastructure | **Medium** | Open |
| **ISSUE-007** | CORS Config Omits Local IP Address (`127.0.0.1:5173`) | Network / Security | **Medium** | Open |
| **ISSUE-008** | Monorepo Structure Duplication (Root vs `/frontend`) | Repo Structure | **Low** | **Resolved** |
| **ISSUE-009** | Strict Pick Prerequisite: Commitment Required Before FIFO Pick | Business Logic | **Low** | Documented |
| **ISSUE-010** | Date-Bound Validation Timezone Discrepancy (`before_or_equal:today`) | Localization / Config | **High** | **Resolved** |
| **ISSUE-011** | Deactivated Accounts Bypassing Login Check | Authentication / UI | **High** | **Resolved** |
| **ISSUE-012** | Client-Side Account Management Resetting on Page Reload | State Management | **Medium** | **Resolved** |

---

## Detailed Issue Registry

### ISSUE-001: Frontend Still Dependent on Static Mock Data
* **Category:** Architecture & Integration
* **Severity:** **High**
* **Status:** Open
* **Locations:**
  * [`src/context/InventoryContext.jsx:L2`](file:///c:/Users/Gams/WholeSystemTest/src/context/InventoryContext.jsx#L2)
  * [`src/data/mockData.js`](file:///c:/Users/Gams/WholeSystemTest/src/data/mockData.js)
  * [`Report-Changes2.md:L1228-1231`](file:///c:/Users/Gams/WholeSystemTest/Report-Changes2.md#L1228-L1231)
* **Description:**
  `Report-Changes2.md` specifies that the React frontend connects to the Laravel REST API via an Axios client with Sanctum Bearer token interceptors. However, `axios` is not installed, no HTTP service layer exists (`src/services/api.js`), and the UI continues to render and manipulate static mock data from `mockProducts`.
* **Impact:**
  The frontend and backend exist as disconnected silos. Transactions performed in the UI (orders, picks, cycle adjustments) do not affect the MySQL/SQLite database, and real-time ATP or ROP alerts are not synchronized.
* **Remediation:**
  1. Install `axios` in frontend `package.json`.
  2. Implement `src/services/api.js` with base URL `import.meta.env.VITE_API_BASE_URL` and a request interceptor attaching `Authorization: Bearer <token>`.
  3. Refactor `InventoryContext.jsx` to fetch live stock from `GET /api/v1/inventory` and trigger actions against `/api/v1/transactions/*`.

---

### ISSUE-002: User Role Enum Mismatch (`manager` in Frontend vs Backend)
* **Category:** Database Schema & Authentication
* **Severity:** **High**
* **Status:** Open
* **Locations:**
  * [`backend/database/migrations/0001_01_01_000000_create_users_table.php:L20`](file:///c:/Users/Gams/WholeSystemTest/backend/database/migrations/0001_01_01_000000_create_users_table.php#L20)
  * [`src/context/AuthContext.jsx:L24`](file:///c:/Users/Gams/WholeSystemTest/src/context/AuthContext.jsx#L24)
* **Description:**
  The React frontend defines three roles: `ROLE_OPTIONS = ['admin', 'manager', 'staff']` and implements specific permission gating for managers (viewing all screens, adding transactions, changing status). In contrast, the Laravel database schema strictly restricts user roles to:
  ```php
  $table->enum('role', ['admin', 'staff'])->default('staff');
  ```
* **Impact:**
  Any attempt to register or seed a user with the `manager` role in Laravel/MySQL will fail with a database constraint violation (`Data truncated for column 'role'`).
* **Remediation:**
  * **Option A (Recommended):** Update migration `0001_01_01_000000_create_users_table.php` to include `'manager'`:
    ```php
    $table->enum('role', ['admin', 'manager', 'staff'])->default('staff');
    ```
    Then run `php artisan migrate:fresh --seed`.
  * **Option B:** Remove `manager` role from the frontend and consolidate responsibilities under `admin` and `staff`.

---

### ISSUE-003: Product ID Format Discrepancy (`PID-` vs `AC-PORT-` / `FILT-`)
* **Category:** Data Modeling
* **Severity:** **Medium**
* **Status:** Open
* **Locations:**
  * [`src/data/mockData.js`](file:///c:/Users/Gams/WholeSystemTest/src/data/mockData.js)
  * [`src/context/InventoryContext.jsx:L28`](file:///c:/Users/Gams/WholeSystemTest/src/context/InventoryContext.jsx#L28)
  * [`backend/database/seeders/ProductSeeder.php`](file:///c:/Users/Gams/WholeSystemTest/backend/database/seeders/ProductSeeder.php)
* **Description:**
  * Frontend mock data uses IDs such as `PID-001`, `PID-002`, `PID-003`.
  * Backend database uses descriptive stock IDs: `AC-PORT-01`, `AC-PORT-02`, `THERM-SMART-01`, `PURIF-AIR-01`, `FILT-CARBON-01`.
  * `InventoryContext.jsx` includes helper functions assuming `PID-` format:
    ```javascript
    function makeRuleId(productId) {
      return `ROZ-${productId.replace('PID-', '')}`;
    }
    ```
* **Impact:**
  When connecting the frontend to the live API, components expecting `PID-` formatting or different attribute names (e.g. `shelfLifeMonths` vs `shelf_life_days`) will fail or display incomplete data.
* **Remediation:**
  Normalize property names between the API response envelope and frontend component props, or create a data mapping adapter in the frontend service layer.

---

### ISSUE-004: Railway Nixpacks Non-Interactive Hanging Bug (`npx serve`)
* **Category:** Cloud Deployment
* **Severity:** **High**
* **Status:** Open
* **Location:**
  * [`frontend/nixpacks.toml:L7`](file:///c:/Users/Gams/WholeSystemTest/frontend/nixpacks.toml#L7)
* **Description:**
  The frontend Nixpacks configuration specifies:
  ```toml
  [start]
  cmd = "npx serve -s dist -l $PORT"
  ```
  `serve` is not listed as a project dependency in `package.json`. When `npx serve` executes in an environment where the package is not pre-installed, `npx` prompts:
  `Need to install the following packages: serve@14.x.x. Ok to proceed? (y)`
* **Impact:**
  Because Railway deployments run in a non-interactive CI/CD shell without an active TTY stdin, the deployment process hangs indefinitely until the build times out and fails.
* **Remediation:**
  Add the `-y` flag to auto-confirm package installation:
  ```toml
  [start]
  cmd = "npx -y serve -s dist -l $PORT"
  ```
  Alternatively, install `serve` directly: `npm install --save-dev serve`.

---

### ISSUE-005: Build-Phase Configuration Caching on Railway
* **Category:** Cloud Deployment & Environment Binding
* **Severity:** **High**
* **Status:** Open
* **Location:**
  * [`backend/nixpacks.toml:L10`](file:///c:/Users/Gams/WholeSystemTest/backend/nixpacks.toml#L10)
* **Description:**
  `backend/nixpacks.toml` executes `php artisan config:cache` during the build phase (`[phases.build]`).
* **Impact:**
  On Railway, production database environment variables (`MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`) are injected at **container runtime**, not during image build. Executing `config:cache` during the build phase bakes empty or fallback environment values into `bootstrap/cache/config.php`, causing database connection errors on boot.
* **Remediation:**
  Remove `php artisan config:cache` from `[phases.build]` in `nixpacks.toml`, and keep it strictly in the runtime start script ([`backend/Procfile`](file:///c:/Users/Gams/WholeSystemTest/backend/Procfile)).

---

### ISSUE-006: Single-Threaded Development Server in Production Procfile
* **Category:** Infrastructure & Performance
* **Severity:** **Medium**
* **Status:** Open
* **Locations:**
  * [`backend/Procfile:L1`](file:///c:/Users/Gams/WholeSystemTest/backend/Procfile#L1)
  * [`backend/nixpacks.toml:L16`](file:///c:/Users/Gams/WholeSystemTest/backend/nixpacks.toml#L16)
* **Description:**
  The backend deployment start command uses `php artisan serve --host=0.0.0.0 --port=$PORT`.
* **Impact:**
  `php artisan serve` utilizes PHP’s built-in CLI web server, which is strictly **single-threaded**. While sufficient for demos and local evaluation, concurrent requests from multiple team members or simultaneous API triggers (e.g. order reservation + barcode pick) will serialize, block, or time out.
* **Remediation:**
  For production deployment, configure Nixpacks with PHP-FPM and Nginx, or run with Laravel Octane / FrankenPHP. If retaining `artisan serve` for lab grading, document that concurrency is limited.

---

### ISSUE-007: CORS Config Omits Local IP Address (`127.0.0.1:5173`)
* **Category:** Network & Security
* **Severity:** **Medium**
* **Status:** Open
* **Location:**
  * [`backend/config/cors.php:L37-42`](file:///c:/Users/Gams/WholeSystemTest/backend/config/cors.php#L37-L42)
* **Description:**
  The `allowed_origins` array contains:
  ```php
  'allowed_origins' => [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://walangbrownoutui.vercel.app',
      env('FRONTEND_URL', 'http://localhost:5173'),
  ],
  ```
  It omits `http://127.0.0.1:5173`.
* **Impact:**
  Browsers treat `localhost` and `127.0.0.1` as distinct origins. When Vite binds to `127.0.0.1` or when developers navigate to `http://127.0.0.1:5173`, browser requests to `http://127.0.0.1:8000/api/v1/*` are blocked by CORS preflight checks (`Cross-Origin Request Blocked`).
* **Remediation:**
  Add `'http://127.0.0.1:5173'` and `'http://127.0.0.1:3000'` to `allowed_origins` in `backend/config/cors.php`.

---

### ISSUE-008: Monorepo Structure Duplication (Root vs `/frontend`)
* **Category:** Repository Organization
* **Severity:** **Low**
* **Status:** **Resolved**
* **Location:**
  * Root directory `WholeSystemTest/` vs `WholeSystemTest/frontend/`
* **Description:**
  The project previously had two identical copies of the frontend:
  1. Root directory: `/src`, `/package.json`, `/vite.config.js`, `/index.html`, `/vercel.json`, `/package-lock.json`, `/dist`, `/node_modules`
  2. Subdirectory: `/frontend/src`, `/frontend/package.json`, etc.
* **Impact:**
  Running commands at the root could execute outdated or divergent root files, while edits intended for Railway deployment were applied inside `/frontend/`.
* **Resolution:**
  Consolidated all frontend code exclusively into `/frontend/` per Step 1.2 of `Report-Changes2.md`. Removed root duplicate files (`/src`, `/index.html`, `/vite.config.js`, `/vercel.json`, `/package.json`, `/package-lock.json`, `/dist`, `/node_modules`), updated root `.gitignore`, and updated root `README.md` with monorepo structure. Tested both frontend (`npm run build` inside `frontend/`) and backend (`php artisan test` + `test-api.ps1`) to verify 100% operation.

---

### ISSUE-009: Strict Pick Prerequisite: Commitment Required Before FIFO Pick
* **Category:** Business Logic / Workflow Constraint
* **Severity:** **Low**
* **Status:** Documented
* **Locations:**
  * [`backend/app/Services/InventoryService.php:L168-173`](file:///c:/Users/Gams/WholeSystemTest/backend/app/Services/InventoryService.php#L168-L173)
  * [`Report-Changes2.md:L1239`](file:///c:/Users/Gams/WholeSystemTest/Report-Changes2.md#L1239)
* **Description:**
  In `InventoryService::executePick`, the system verifies that committed quantity is greater than or equal to pick quantity:
  ```php
  if ($inventory->quantity_committed < $quantity) {
      throw new RuntimeException("COMMITMENT_MISMATCH: Pick quantity {$quantity} exceeds committed quantity...");
  }
  ```
* **Impact:**
  When testing the FIFO violation scenario described in Roadmap Week 4 (*"Trigger PICK with wrong filter lot: Confirm FIFO validation blocks pick"*), if a tester attempts `PICK` directly without first executing a `COMMIT` transaction, the request fails with `COMMITMENT_MISMATCH` before FIFO lot logic is evaluated.
* **Remediation:**
  Ensure testing documentation explicitly mandates executing an order `COMMIT` first before scanning a `PICK` lot.

---

### ISSUE-010: Date-Bound Validation Timezone Discrepancy
* **Category:** Localization & Validation
* **Severity:** **High**
* **Status:** **Resolved** (2026-10-10)
* **Resolution:**
  * Configured `APP_TIMEZONE=Asia/Manila` in [`backend/.env`](file:///c:/Users/Gams/WholeSystemTest/backend/.env).
  * Updated [`backend/config/app.php:L68`](file:///c:/Users/Gams/WholeSystemTest/backend/config/app.php#L68) to `'timezone' => env('APP_TIMEZONE', 'Asia/Manila')`.
  * Verified: `POST /api/v1/batches` with local date now passes validation 100%. Documented under Test #17 in `Testing-Report.md`.

---

### ISSUE-011: Deactivated Accounts Bypassing Login Check
* **Category:** Authentication & UI Security
* **Severity:** **High**
* **Status:** **Resolved** (2026-10-10)
* **Resolution:**
  * Added `if (!found.active)` check to `login()` in [`src/context/AuthContext.jsx`](file:///c:/Users/Gams/WholeSystemTest/src/context/AuthContext.jsx).
  * Added guard against self-deactivation in `toggleUserActive()`.
  * Verified: Inactive accounts are blocked from signing in with a user-friendly error message. Documented under Test #33 in `Testing-Report.md`.

---

### ISSUE-012: Client-Side Account Management Resetting on Page Reload
* **Category:** State Management
* **Severity:** **Medium**
* **Status:** **Resolved** (2026-10-10)
* **Resolution:**
  * Added `localStorage` persistence (`wb_registered_users` and `wb_auth_user`) in `AuthContext.jsx`.
  * Integrated backend seeder accounts (`admin@walangbrownout.com` and `staff@walangbrownout.com`) into the frontend's default user registry.
  * Verified: Role edits, deactivations, and new registrations persist across page refreshes and logouts. Documented under Tests #34–#36 in `Testing-Report.md`.

---

## Maintenance Guidelines

1. **Adding a New Issue:**
   * Assign the next sequential ID (`ISSUE-013`, etc.).
   * Categorize by: Architecture, Database, Cloud/Deployment, Security, or Business Logic.
   * Add a row to the **Issue Status Matrix**.
   * Document root cause, impact, file/line locations, and actionable remediation steps.
2. **Resolving an Issue:**
   * Mark Status as **Resolved** with resolution date.
   * Document the specific code changes and verification steps taken.
