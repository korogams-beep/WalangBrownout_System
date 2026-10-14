# Comprehensive Deployment Guide: Railway & MySQL

**Project:** Walang Brownout Appliances — Inventory Control System  
**Stack:** React 18 + Vite SPA (Frontend) | Laravel 11 REST API (Backend) | MySQL 8.0 (Database)  
**Target Platform:** [Railway.com](https://railway.com)  

---

## Architecture Overview

```
                        ┌────────────────────────────────────────┐
                        │              User Browser              │
                        └───────────────────┬────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     │ HTTPS                                       │ HTTPS (API requests)
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │     Railway Service:      │                 │     Railway Service:      │
       │    Frontend (React SPA)   │                 │   Backend (Laravel API)   │
       │   Root Dir: /frontend     │                 │    Root Dir: /backend     │
       │   Port: $PORT (serve SPA) │                 │   Port: $PORT (artisan)   │
       └───────────────────────────┘                 └─────────────┬─────────────┘
                                                                   │
                                                Internal TCP (3306)│ Private Railway Network
                                                                   ▼
                                                     ┌───────────────────────────┐
                                                     │     Railway Service:      │
                                                     │         MySQL 8.0         │
                                                     │ (Persistent Storage Vol)  │
                                                     └───────────────────────────┘
```

---

## Prerequisites

Before beginning the deployment, ensure you have:

1. A **Railway Account** ([railway.com](https://railway.com)) connected to your GitHub account.
2. The **GitHub Repository** pushed with all latest commits.
3. Access to a browser and (optionally) the **Railway CLI** for database seeding or direct terminal access.

---

## Step 1: Create a Railway Project & Provision MySQL

1. Log in to [Railway Dashboard](https://railway.app/dashboard).
2. Click **+ New Project** in the upper-right corner.
3. Choose **Provision MySQL** (or select **Empty Project**, then click **+ New** &rarr; **Database** &rarr; **Add MySQL**).
4. Railway will create a MySQL service with a persistent storage volume.
5. Click on the **MySQL** service tile and go to the **Variables** tab. You will see auto-generated credentials:
   - `MYSQLHOST` — The internal private hostname (e.g., `mysql.railway.internal`).
   - `MYSQLPORT` — Usually `3306`.
   - `MYSQLDATABASE` — Usually `railway`.
   - `MYSQLUSER` — Usually `root`.
   - `MYSQLPASSWORD` — Auto-generated secure password.
   - `MYSQL_URL` — Full connection URI.

> [!TIP]
> **External GUI Database Access (Optional):**  
> If you want to connect via DBeaver, TablePlus, or HeidiSQL from your computer:
> 1. In the MySQL service, open **Settings** &rarr; **Networking**.
> 2. Click **Enable Public Networking** (Generate TCP Proxy).
> 3. Railway will give you an external host (e.g., `monorail.proxy.rlwy.net`) and an assigned external port.

---

## Step 2: Deploy the Backend API Service (Laravel 11)

### 2.1 Add the Backend Service
1. In the same Railway project canvas, click **+ New** (or **Add Service**) &rarr; **GitHub Repo**.
2. Select your repository (`WalangBrownout_System`).
3. Click on the newly added service card to open its settings.

### 2.2 Configure Monorepo Root Directory (CRITICAL)
1. Go to the **Settings** tab.
2. In the **General** section, change the service name to `backend` (or `walangbrownout-backend`).
3. Scroll down to **Root Directory** and set it to:
   ```
   /backend
   ```
   *This ensures Railway builds only the Laravel service using `backend/nixpacks.toml`.*

### 2.3 Generate Backend Public Domain
1. In the **Settings** tab, scroll to **Networking**.
2. Click **Generate Domain**.
3. Railway will create a URL such as:
   ```
   walangbrownout-backend.up.railway.app
   ```
   *(Save this URL; you will need it for the frontend configuration).*

### 2.4 Configure Backend Environment Variables
1. Go to the **Variables** tab of the backend service.
2. Click **RAW Editor** (or add variables individually) and insert:

```ini
APP_NAME="Walang Brownout Appliances"
APP_ENV=production
APP_KEY=base64:r7hN8mnVTXEUWRahA7t3sJWLKJfCSjaWliQe6tGfdpA=
APP_DEBUG=false
APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
APP_TIMEZONE=Asia/Manila

# Logging (stderr allows real-time viewing in Railway Deploy Logs)
LOG_CHANNEL=stderr
LOG_LEVEL=info

# Database Connection (Railway Template Reference Variables)
DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

# Session & Security
SESSION_DRIVER=database
BCRYPT_ROUNDS=12

# Frontend URL (Update this once Frontend Domain is generated in Step 3)
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

> [!NOTE]
> Railway supports variable references like `${{MySQL.MYSQLHOST}}`. If your MySQL service tile is named something else, select the variable reference picker by typing `${{` and selecting your MySQL host/port/user/password.

### 2.5 Understanding the Backend Build & Start Process
Railway automatically reads [`backend/nixpacks.toml`](file:///c:/Users/Gams/WholeSystemTest/backend/nixpacks.toml):
- **Phases Setup:** Installs PHP 8.3 with `pdo_mysql`, `mbstring`, `openssl`, and `composer`.
- **Phases Build:** Executes `composer install --no-dev --optimize-autoloader`.
- **Start Command:**
  ```bash
  php artisan config:clear && php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=$PORT
  ```
- This automatically runs all database migrations against your Railway MySQL instance on every container boot.

---

## Step 3: Seed the Production Database (Initial Data & Users)

When deploying to a brand-new MySQL instance, tables are migrated, but the database initially contains no products or user accounts. You must run the seeders once.

### Method A: Via Railway Web Terminal / Command Exec (Recommended)
1. In the Railway dashboard, click on the **backend** service.
2. Open the **Deployments** tab and click on the active deployment.
3. Open the **Console** or **Terminal** tab.
4. Run the following command:
   ```bash
   php artisan db:seed --force
   ```
5. You will see:
   ```
   Users seeded: 3 system accounts (admin, manager, staff) + 4 team member accounts.
   Products seeded: 30 appliances and filtration items.
   Batches seeded: 74 inventory lots.
   ```

### Method B: Via One-Time Start Command Override
1. In the backend service, go to **Settings** &rarr; **Deploy**.
2. Temporarily set the **Custom Start Command** to:
   ```bash
   php artisan migrate --force && php artisan db:seed --force && php artisan serve --host=0.0.0.0 --port=$PORT
   ```
3. Allow the deployment to finish successfully.
4. Clear the Custom Start Command back to default so it does not re-seed on every restart.

### Default Seeded Production Accounts

*(For the complete list of team accounts and offline demo credentials, see [`Demo-Accounts.md`](Demo-Accounts.md))*

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@walangbrownout.com` | `Admin@WB2026!` |
| **Inventory Manager** | `manager@walangbrownout.com` | `Manager@WB2026!` |
| **Warehouse Staff** | `staff@walangbrownout.com` | `Staff@WB2026!` |

---

## Step 4: Verify Backend Health

Before setting up the frontend, verify that the backend and database connection are working:

1. Open your browser and navigate to:
   ```
   https://<your-backend-domain>.up.railway.app/api/v1/health
   ```
2. You should see a JSON status output:
   ```json
   {
     "status": "ok",
     "app": "Walang Brownout Appliances API",
     "version": "1.0.0",
     "environment": "production",
     "database": "connected",
     "timestamp": "2026-10-14T..."
   }
   ```
If `"database": "connected"` appears, your Laravel backend has successfully established a connection with your Railway MySQL instance!

---

## Step 5: Deploy the Frontend Service (React + Vite SPA)

### 5.1 Add the Frontend Service
1. In your Railway project canvas, click **+ New** &rarr; **GitHub Repo**.
2. Select the same repository (`WalangBrownout_System`).
3. Click on the new service card.

### 5.2 Configure Monorepo Root Directory
1. Go to the **Settings** tab.
2. Rename the service to `frontend` (or `walangbrownout-frontend`).
3. In **Root Directory**, set:
   ```
   /frontend
   ```

### 5.3 Configure Frontend Environment Variables
1. Go to the **Variables** tab.
2. Add the API URL pointing to your backend's `/api/v1` endpoint:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://<your-backend-domain>.up.railway.app/api/v1` | Do NOT add a trailing slash |

> [!IMPORTANT]
> **Vite Environment Variable Baking:**  
> Vite embeds `VITE_*` variables during the **build phase** (`npm run build`). Whenever you change `VITE_API_BASE_URL`, you must trigger a **Redeploy** on the frontend service.

### 5.4 Generate Frontend Public Domain
1. In the **Settings** tab &rarr; **Networking**.
2. Click **Generate Domain**.
3. Railway will assign a public domain, e.g.:
   ```
   walangbrownout-frontend.up.railway.app
   ```

### 5.5 Understanding the Frontend Build & Start Process
Railway automatically reads [`frontend/nixpacks.toml`](file:///c:/Users/Gams/WholeSystemTest/frontend/nixpacks.toml):
- **Phases Build:** Executes `npm install && npm run build` (builds production bundle into `dist/`).
- **Start Command:** Executes `npx serve -s dist -l $PORT --no-clipboard`.
- The `-s` flag enables SPA fallback (direct browser refreshes on routes like `/inventory` will not 404).
- The `--no-clipboard` flag ensures headless execution without terminal hanging.

---

## Step 6: Link Frontend and Backend (CORS Configuration)

To allow the frontend to authenticate and make API calls to the backend without CORS blocks:

1. Copy your generated frontend domain (e.g., `https://walangbrownout-frontend.up.railway.app`).
2. Go to the **backend** service in Railway &rarr; **Variables**.
3. Update the `FRONTEND_URL` variable to your frontend domain:
   ```ini
   FRONTEND_URL=https://walangbrownout-frontend.up.railway.app
   ```
4. Railway will automatically redeploy the backend with the new allowed CORS origin.
*(Note: `backend/config/cors.php` already contains wildcard regex support for all `*.railway.app` domains as an additional safeguard).*

---

## Step 7: End-to-End Testing & Verification

1. Open your frontend URL (`https://walangbrownout-frontend.up.railway.app`).
2. Log in using `admin@walangbrownout.com` and `Admin@WB2026!`.
3. Verify all modules:
   - **Dashboard:** Check inventory KPI metric cards, quick-action drawer, and system alerts.
   - **Products Catalog:** View all 30 seeded products, filter by ABC classification.
   - **Inventory Status:** Inspect live Available-to-Promise (ATP) calculations, allocated quantities, and reorder levels.
   - **Batches & Lots:** Inspect FIFO lot queues, shelf-life indicators, and expiration warnings.
   - **Transaction Audit Log:** Review order reservations, barcode scanning picks, and cycle count adjustments.
4. Open your browser Developer Tools (F12) &rarr; **Network** tab to verify that calls to `/api/v1/*` return `200 OK` with Authorization Bearer tokens.

---

## Troubleshooting Guide

### 1. Database Connection Refused (`SQLSTATE[HY000] [2002]`)
- **Cause:** Backend cannot resolve or reach the MySQL hostname.
- **Fix:** In the Backend Variables tab, verify variable syntax:
  - `${{MySQL.MYSQLHOST}}` or `${MYSQLHOST}`.
  - Verify that MySQL is running in the same Railway project canvas.

### 2. Frontend Network Errors / CORS Blocked
- **Cause:** The backend does not recognize the frontend domain origin.
- **Fix:**
  - Verify `FRONTEND_URL` in the backend service variables matches your exact frontend URL (including `https://`, no trailing slash).
  - Verify `VITE_API_BASE_URL` in the frontend variables ends with `/api/v1` and matches the backend domain.

### 3. Frontend Shows 404 on Page Refresh
- **Cause:** Static file server trying to find physical directory instead of falling back to `index.html`.
- **Fix:** Both [`nixpacks.toml`](file:///c:/Users/Gams/WholeSystemTest/frontend/nixpacks.toml) and [`Procfile`](file:///c:/Users/Gams/WholeSystemTest/Procfile) are already configured with `serve -s dist -l $PORT --no-clipboard`. The `-s` flag handles SPA routing automatically.

### 4. Blank Page or Stale API Calls in Frontend
- **Cause:** Vite compiled without the `VITE_API_BASE_URL` variable set.
- **Fix:** In the Railway frontend service, go to **Deployments** &rarr; click the three dots (`...`) &rarr; **Redeploy** (Clear build cache and deploy).

---

## Maintenance & Common Operations

### Backing Up MySQL Database
1. In the Railway dashboard, open the **MySQL** service.
2. Go to the **Data** tab to download snapshots or use the CLI:
   ```bash
   railway run mysqldump -u root -p railway > backup.sql
   ```

### Rolling Out Code Updates
Because this repository is connected directly to Railway:
- Any `git push origin main` triggers automatic builds on both frontend and backend services.
- Database migrations run automatically on backend boot (`php artisan migrate --force`).
