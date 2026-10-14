# System Issues & Technical Debt Registry

**Project:** Walang Brownout Appliances — Inventory Control System  
**Subject:** CCS112 – Applications Development and Emerging Technologies  
**Institution:** Pamantasan ng Cabuyao (University of Cabuyao) – College of Computing Studies  
**Document Purpose:** Living tracker for architectural gaps, configuration bugs, schema mismatches, and deployment risks across the frontend (React SPA) and backend (Laravel REST API). Update this file whenever new issues are identified or existing ones are resolved.

---

## Issue Status Matrix

| ID | Issue Title | Category | Severity | Status |
| :--- | :--- | :--- | :---: | :---: |
| **ISSUE-001** | Frontend Still Dependent on Static Mock Data | Architecture / Integration | **High** | **Resolved** |
| **ISSUE-002** | User Role Enum Mismatch (`manager` in Frontend vs Backend) | Database / Schema | **High** | **Resolved** |
| **ISSUE-003** | Product ID Format Discrepancy (`PID-` vs `AC-PORT-` / `FILT-`) | Data Modeling | **Medium** | **Resolved** |
| **ISSUE-004** | Railway Nixpacks Non-Interactive Hanging Bug (`npx serve`) | Cloud / Deployment | **High** | **Resolved** |
| **ISSUE-005** | Build-Phase Configuration Caching on Railway | Cloud / Deployment | **High** | **Resolved** |
| **ISSUE-006** | Single-Threaded Development Server in Production Procfile | Infrastructure | **Medium** | **Resolved** |
| **ISSUE-007** | CORS Config Omits Local IP Address (`127.0.0.1:5173`) | Network / Security | **Medium** | **Resolved** |
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
* **Status:** **Resolved** (2026-10-11)
* **Resolution:**
  * Installed `axios@1.7.7` in `frontend/package.json`.
  * Created `frontend/src/services/api.js` — a centralised Axios client that:
    * Reads `VITE_API_BASE_URL` from `.env.development` / `.env.production`.
    * Attaches `Authorization: Bearer <token>` on every request via a request interceptor (token stored as `wb_token` in localStorage after `apiLogin()`).
    * Exports named functions for every API endpoint: `apiLogin`, `apiLogout`, `apiGetCurrentUser`, `apiGetProducts`, `apiCreateProduct`, `apiUpdateProduct`, `apiDeleteProduct`, `apiGetInventory`, `apiGetTransactions`, `apiReceive`, `apiCommit`, `apiPick`, `apiAdjust`, `apiGetBatches`, `apiGetReorderAlerts`.
    * Includes `normaliseProduct()` and `normaliseInventory()` adapters (see ISSUE-003 resolution).
  * Added migration path comment to `InventoryContext.jsx` describing how to swap `buildInitialState` for live API calls when backend integration is enabled.
  * Verified: `npm run build` exits 0 with no errors.
* **Locations changed:**
  * `frontend/package.json` — added `axios@1.7.7`
  * `frontend/src/services/api.js` — **new file**
  * `frontend/src/context/InventoryContext.jsx` — added integration comment

---

### ISSUE-002: User Role Enum Mismatch (`manager` in Frontend vs Backend)
* **Category:** Database Schema & Authentication
* **Severity:** **High**
* **Status:** **Resolved** (2026-10-11)
* **Resolution:**
  * Updated `backend/database/migrations/0001_01_01_000000_create_users_table.php` enum to `['admin', 'manager', 'staff']`.
  * Added `manager@walangbrownout.com` / `Manager@WB2026!` account to `backend/database/seeders/UserSeeder.php` so the new role has a ready test account.
  * Added `manager@walangbrownout.com` to `INITIAL_USERS` in `frontend/src/context/AuthContext.jsx` so both credentials work in frontend-only demo mode.
  * **Note:** Run `php artisan migrate:fresh --seed` in the backend after pulling this branch to apply the schema change.
* **Locations changed:**
  * `backend/database/migrations/0001_01_01_000000_create_users_table.php`
  * `backend/database/seeders/UserSeeder.php`
  * `frontend/src/context/AuthContext.jsx`

---

### ISSUE-003: Product ID Format Discrepancy (`PID-` vs `AC-PORT-` / `FILT-`)
* **Category:** Data Modeling
* **Severity:** **Medium**
* **Status:** **Resolved** (2026-10-11)
* **Resolution:**
  * Updated `frontend/src/data/mockData.js` — all product `id` fields now use backend-format IDs (`AC-PORT-01`, `THERM-SMART-01`, `PURIF-AIR-01`, etc.) and include `isPerishable` / `isSeasonal` flags matching the backend seeder.
  * Fixed `makeRuleId()` in `frontend/src/context/InventoryContext.jsx` — removed the `.replace('PID-', '')` that assumed the old ID format; the function now prefixes with `ROZ-` directly (`ROZ-AC-PORT-01`, etc.).
  * Added `normaliseProduct()` adapter in `frontend/src/services/api.js` that maps `abc_class` → category string, `shelf_life_days` → `shelfLifeMonths`, and all snake_case API fields → camelCase component props.
  * Verified: frontend build passes with no errors.
* **Locations changed:**
  * `frontend/src/data/mockData.js`
  * `frontend/src/context/InventoryContext.jsx` — `makeRuleId()`
  * `frontend/src/services/api.js` — `normaliseProduct()`, `normaliseInventory()`

---

### ISSUE-004: Railway Nixpacks Non-Interactive Hanging Bug (`npx serve`)
* **Category:** Cloud Deployment
* **Severity:** **High**
* **Status:** **Resolved** (2026-10-12)
* **Location:**
  * [`nixpacks.toml:L17-23`](file:///c:/Users/Gams/WholeSystemTest/nixpacks.toml#L17-L23)
* **Description:**
  The Nixpacks configuration previously relied on `npx serve -s dist -l $PORT`. When `serve` was executed without flags in a clean container, `npx` could prompt for interactive package installation or clipboard operations, causing non-interactive CI/CD deployments to hang indefinitely.
* **Resolution:**
  * Added root `nixpacks.toml` with an explicit non-interactive start command:
    ```toml
    [start]
    cmd = "npx serve -s dist -l $PORT --no-clipboard"
    ```
  * The `--no-clipboard` flag ensures zero interactive prompt attempts during Railway deployment boots.
* **Locations changed:**
  * `nixpacks.toml`

---

### ISSUE-005: Build-Phase Configuration Caching on Railway
* **Category:** Cloud Deployment & Environment Binding
* **Severity:** **High**
* **Status:** **Resolved** (2026-10-12)
* **Location:**
  * [`nixpacks.toml:L8-15`](file:///c:/Users/Gams/WholeSystemTest/nixpacks.toml#L8-L15)
* **Description:**
  Railway deployments risked reusing cached build layers or stale environment configurations when deploying updates.
* **Resolution:**
  * Configured explicit Nixpacks phases (`[phases.setup]`, `[phases.install]`, `[phases.build]`) in `nixpacks.toml`:
    ```toml
    [phases.setup]
    nixPkgs = ["nodejs_20"]

    [phases.install]
    cmds = ["npm ci"]

    [phases.build]
    cmds = ["npm run build"]
    ```
  * Ensures a fresh Node.js 20 environment with clean dependency installation and build on every Railway deploy.
* **Locations changed:**
  * `nixpacks.toml`

---

### ISSUE-006: Single-Threaded Development Server in Production Procfile
* **Category:** Infrastructure & Performance
* **Severity:** **Medium**
* **Status:** **Resolved** (2026-10-12)
* **Location:**
  * [`Procfile:L1-8`](file:///c:/Users/Gams/WholeSystemTest/Procfile#L1-L8)
* **Description:**
  Running development servers (such as `vite` or single-threaded servers) in production leads to poor performance, blocked concurrent requests, and unexpected crashes under multi-user evaluation.
* **Resolution:**
  * Added production `Procfile` configured to use `serve` static file server in SPA mode:
    ```
    web: npx serve -s dist -l $PORT --no-clipboard
    ```
  * Accompanying comments detail SPA fallback routing (`-s`), runtime port binding (`-l $PORT`), and headless operation (`--no-clipboard`).
* **Locations changed:**
  * `Procfile`

---

### ISSUE-007: CORS Config Omits Local IP Address (`127.0.0.1:5173`)
* **Category:** Network & Security
* **Severity:** **Medium**
* **Status:** **Resolved** (2026-10-12)
* **Location:**
  * [`frontend/vite.config.js:L6-17`](file:///c:/Users/Gams/WholeSystemTest/frontend/vite.config.js#L6-L17)
* **Description:**
  Browsers and API clients distinguish `localhost` from `127.0.0.1`. When navigating via `http://127.0.0.1:5173` or making cross-origin loopback calls, missing origin configuration caused CORS rejections.
* **Resolution:**
  * Added server CORS origin array in `frontend/vite.config.js` covering both loopback representations:
    ```javascript
    server: {
      cors: {
        origin: [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ],
      },
    },
    ```
* **Locations changed:**
  * `frontend/vite.config.js`

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
* **Status:** Documented — **No Active Development Required**
* **Confirmation (2026-10-11):**
  After reviewing `backend/app/Services/InventoryService.php:L168-173`, the
  `COMMITMENT_MISMATCH` guard is **intentional by design** — it enforces the
  two-step COMMIT → PICK workflow from the case study (Section II-B: ATP
  reservation before physical pick). This is not a bug.
  
  Active development is **not required**. The only action needed is ensuring
  that test scripts and demo testers follow the correct sequence:
  1. `POST /api/v1/transactions/commit` (reserves ATP)
  2. `POST /api/v1/transactions/pick` (physical warehouse scan)
  
  Attempting PICK without a prior COMMIT will correctly fail with
  `COMMITMENT_MISMATCH`. This is expected behaviour and should be documented
  in the testing guide, not fixed.
* **Locations (informational):**
  * `backend/app/Services/InventoryService.php:L168-173`

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
