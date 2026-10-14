# Local Deployment & Database Management Guide (XAMPP & Railway)

**Project:** Walang Brownout Appliances — Inventory Control System  
**Stack:** React 18 + Vite (Frontend) | Laravel 11 REST API (Backend) | MySQL 8.0 (Database via XAMPP or Railway)  
**Tools Covered:** XAMPP, phpMyAdmin (Local & Cloud Railway), Composer, Node.js  

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites Checklist](#2-prerequisites-checklist)
3. [Part 1: Local System Deployment (Step-by-Step)](#3-part-1-local-system-deployment-step-by-step)
   - [Step 1: Start XAMPP & Create Local Database](#step-1-start-xampp--create-local-database)
   - [Step 2: Configure & Run Laravel 11 Backend API](#step-2-configure--run-laravel-11-backend-api)
   - [Step 3: Configure & Run React + Vite Frontend](#step-3-configure--run-react--vite-frontend)
   - [Step 4: Verify Local Deployment & Demo Accounts](#step-4-verify-local-deployment--demo-accounts)
4. [Part 2: Accessing Local Database via XAMPP phpMyAdmin](#4-part-2-accessing-local-database-via-xampp-phpmyadmin)
5. [Part 3: Accessing Railway Database via phpMyAdmin](#5-part-3-accessing-railway-database-via-phpmyadmin)
   - [Method A: Connect Local XAMPP phpMyAdmin to Railway Cloud MySQL (Recommended)](#method-a-connect-local-xampp-phpmyadmin-to-railway-cloud-mysql-recommended)
   - [Method B: Deploy Cloud phpMyAdmin Service Directly on Railway (Zero-Config Web UI)](#method-b-deploy-cloud-phpmyadmin-service-directly-on-railway-zero-config-web-ui)
   - [Method C: Quick Desktop GUI Alternative (DBeaver / TablePlus / HeidiSQL)](#method-c-quick-desktop-gui-alternative-dbeaver--tableplus--heidisql)
6. [Part 4: Common Troubleshooting & Solutions](#6-part-4-common-troubleshooting--solutions)

---

## 1. Architecture Overview

In your local environment, the system runs across three local endpoints:

```
┌────────────────────────────────────────────────────────┐
│               Web Browser (Client)                    │
│            http://localhost:5173                       │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
               ▼                         ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  React 18 + Vite Frontend   │   │   Laravel 11 REST API       │
│  Port: 5173 (Vite Dev Server)│  │   Port: 8000 (artisan serve)│
└─────────────────────────────┘   └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │      MySQL Database         │
                                  │   Local: XAMPP Port 3306    │
                                  │   OR Railway Cloud Proxy    │
                                  │   Web UI: phpMyAdmin        │
                                  └─────────────────────────────┘
```

---

## 2. Prerequisites Checklist

Ensure the following tools are installed on your Windows machine:

| Requirement | Recommended Version | Verification Command | Description / Download |
| :--- | :--- | :--- | :--- |
| **XAMPP** | 8.2.x or 8.3.x | Open XAMPP Control Panel | Provides Apache, MySQL, and phpMyAdmin ([apachefriends.org](https://www.apachefriends.org)) |
| **PHP** | 8.2 or higher | `php -v` | Installed via XAMPP (`C:\xampp\php`) or standalone |
| **Composer** | 2.6+ | `composer -v` | PHP Dependency Manager ([getcomposer.org](https://getcomposer.org)) |
| **Node.js & npm** | Node 18+ (or 20 LTS) | `node -v` & `npm -v` | JavaScript runtime ([nodejs.org](https://nodejs.org)) |

> [!TIP]
> **Ensure PHP and Composer are in Windows PATH:**  
> If `php` or `composer` is not recognized in your terminal, add `C:\xampp\php` to your Windows System Environment Variables under `Path`.

---

## 3. Part 1: Local System Deployment (Step-by-Step)

### Step 1: Start XAMPP & Create Local Database

1. Launch **XAMPP Control Panel** (Run as Administrator).
2. Click **Start** for both **Apache** and **MySQL**:
   - Both module status indicators should turn green.
   - Default ports: Apache (`80, 443`), MySQL (`3306`).
3. Open your browser and navigate to phpMyAdmin:
   ```
   http://localhost/phpmyadmin
   ```
4. Create the project database:
   - Click **New** in the left sidebar navigation.
   - Database name: `walangbrownout_db`
   - Collation: `utf8mb4_unicode_ci`
   - Click **Create**.

---

### Step 2: Configure & Run Laravel 11 Backend API

Open **PowerShell** or **Command Prompt** and navigate to the `backend` directory:

```powershell
cd c:\Users\Gams\WholeSystemTest\backend
```

#### 2.1 Install PHP Dependencies
```powershell
composer install
```

#### 2.2 Setup Environment File
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```

#### 2.3 Generate Application Encryption Key
```powershell
php artisan key:generate
```

#### 2.4 Configure `.env` for XAMPP MySQL
Open `backend\.env` in your text editor (VS Code, Notepad, etc.) and ensure the database and frontend parameters match:

```ini
APP_NAME="WalangBrownout Backend"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

# ── Local MySQL Configuration (XAMPP Default) ──
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=walangbrownout_db
DB_USERNAME=root
DB_PASSWORD=

# ── CORS Settings (Allows Vite frontend to call this API) ──
FRONTEND_URL=http://localhost:5173
```

> [!NOTE]
> XAMPP MySQL default username is `root` with a **blank/empty** password. Keep `DB_PASSWORD=` empty unless you manually set a root password in XAMPP.

#### 2.5 Run Database Migrations & Seeders
This builds all tables (`users`, `products`, `batches`, `transactions`, `audit_logs`, etc.) and populates initial demo accounts:
```powershell
php artisan migrate:fresh --seed
```
*Expected output: "Database seeding completed successfully."*

#### 2.6 Start the Laravel API Server
```powershell
php artisan serve
```
*The API is now running at: `http://127.0.0.1:8000` (Leave this terminal running).*

---

### Step 3: Configure & Run React + Vite Frontend

Open a **second terminal** and navigate to the `frontend` directory:

```powershell
cd c:\Users\Gams\WholeSystemTest\frontend
```

#### 3.1 Install NPM Dependencies
```powershell
npm install
```

#### 3.2 Verify Local Frontend Environment
Verify that `frontend\.env.development` contains:
```ini
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

#### 3.3 Start the Vite Development Server
```powershell
npm run dev
```
*Expected output:*
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```
*(Leave this terminal running).*

---

### Step 4: Verify Local Deployment & Demo Accounts

1. Open your browser and go to:
   ```
   http://localhost:5173
   ```
2. Log in using any of the seeded credentials:

| Role | Username | Email | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `Ais` | `ais@walangbrownout.com` | `WB@Pnc2026!` | Full CRUD, Batches, Adjustments, Audit Logs, Accounts |
| **Inventory Manager** | `Brent` | `brent@walangbrownout.com` | `WB@Pnc2026!` | Transactions, Order Commit, ATP Monitoring, Product Edit |
| **Warehouse Staff** | `Emerson` | `emerson@walangbrownout.com` | `WB@Pnc2026!` | FIFO Barcode Pick, Lot Receiving, Status Updates |
| **Warehouse Staff 2** | `Ezra` | `ezra@walangbrownout.com` | `WB@Pnc2026!` | FIFO Barcode Pick, Lot Receiving, Status Updates |

---

## 4. Part 2: Accessing Local Database via XAMPP phpMyAdmin

### Step-by-Step Local phpMyAdmin Guide:

1. **Open phpMyAdmin:**
   - With Apache & MySQL active in XAMPP, open:
     ```
     http://localhost/phpmyadmin
     ```
     *(or click the **Admin** button next to MySQL inside XAMPP Control Panel)*.

2. **Select Database:**
   - In the left sidebar tree, click on `walangbrownout_db`.

3. **Explore System Tables:**
   You will see all application tables:
   - `users` — Administrator, Manager, and Staff user accounts and hashed passwords.
   - `products` — SKU, product names, categories, safety stock levels, unit prices.
   - `batches` — Lot/batch inventory tracking, expiration dates, remaining stock (FIFO basis).
   - `transactions` — Outbound sales orders, stock reservations, order statuses.
   - `transaction_items` — Allocated items per transaction.
   - `inventory_adjustments` — Cycle count variances and discrepancy logs.
   - `audit_logs` — Immutable audit trail of every user action.
   - `personal_access_tokens` — Laravel Sanctum Bearer tokens.

4. **Useful phpMyAdmin Actions:**
   - **View / Edit Records:** Click any table name (e.g., `products`) &rarr; click **Browse** to see rows &rarr; click **Edit** (pencil icon) to modify a specific record.
   - **Run Custom SQL:** Click the **SQL** tab at the top and execute queries:
     ```sql
     -- Check total available stock across all active batches
     SELECT p.sku, p.name, SUM(b.quantity_available) AS total_available
     FROM products p
     LEFT JOIN batches b ON p.id = b.product_id
     GROUP BY p.id;
     ```
   - **Export Database Backup (`.sql`):**
     1. Click on `walangbrownout_db`.
     2. Click the **Export** tab in the top navigation.
     3. Select **Quick - display only the minimal options** & Format: **SQL**.
     4. Click **Export** to download your complete SQL dump.
   - **Import Database Backup:**
     1. Click on `walangbrownout_db` (or create a new database).
     2. Click the **Import** tab.
     3. Choose your `.sql` file and click **Import**.

---

## 5. Part 3: Accessing Railway Database via phpMyAdmin

Railway runs MySQL securely inside its cloud infrastructure. To manage your Railway database using a phpMyAdmin graphical interface, you can choose between two methods:

---

### Method A: Connect Local XAMPP phpMyAdmin to Railway Cloud MySQL (Recommended)

This method lets you use your existing **local XAMPP phpMyAdmin** interface to browse and manage your live Railway database directly from your desktop.

#### Step A.1: Enable Public TCP Proxy in Railway
1. Open the [Railway Dashboard](https://railway.app/dashboard).
2. Click on your project, then click on the **MySQL** service card.
3. Go to the **Settings** tab.
4. Scroll down to the **Networking** section.
5. Under **Public Networking**, click **Enable Public Networking** (or **Generate Domain / TCP Proxy**).
6. Go to the **Variables** tab (or **Connect** tab). Railway will show your external connection details:
   - **Public Host:** e.g., `monorail.proxy.rlwy.net` (or `junction.proxy.rlwy.net`)
   - **Public Port:** e.g., `45678` *(A unique 5-digit port assigned by Railway — NOT 3306!)*
   - **Username:** `root`
   - **Password:** *(Copy your `MYSQLPASSWORD` value)*
   - **Database:** `railway`

#### Step A.2: Configure XAMPP's `config.inc.php` for Railway
1. Open File Explorer and navigate to your XAMPP installation directory:
   ```
   C:\xampp\phpMyAdmin\config.inc.php
   ```
2. Open `config.inc.php` in VS Code or Notepad (Run text editor as Administrator if needed).
3. Scroll to the bottom of the file (before any closing PHP tag if present) and add a second server definition:

```php
/* ------------------------------------------------------------- */
/* Railway Cloud MySQL Server                                     */
/* ------------------------------------------------------------- */
$i++;
$cfg['Servers'][$i]['verbose']       = 'Railway Cloud MySQL';
$cfg['Servers'][$i]['host']          = 'monorail.proxy.rlwy.net'; // <-- REPLACE with your Railway Public Host
$cfg['Servers'][$i]['port']          = 45678;                     // <-- REPLACE with your Railway Public Port (number only)
$cfg['Servers'][$i]['socket']        = '';
$cfg['Servers'][$i]['connect_type']  = 'tcp';
$cfg['Servers'][$i]['extension']     = 'mysqli';
$cfg['Servers'][$i]['auth_type']     = 'cookie';                  // Prompts for password securely
$cfg['Servers'][$i]['user']          = 'root';
$cfg['Servers'][$i]['ssl']           = false;
$cfg['Servers'][$i]['compress']      = false;
```

> [!IMPORTANT]
> - Replace `monorail.proxy.rlwy.net` with the exact host from your Railway MySQL Public Networking tab.
> - Replace `45678` with your exact assigned Railway TCP port.
> - Keep `$cfg['Servers'][$i]['auth_type'] = 'cookie';` so phpMyAdmin safely asks for credentials upon login.

#### Step A.3: Login to Railway via phpMyAdmin
1. In your browser, open:
   ```
   http://localhost/phpmyadmin
   ```
2. You will now see a **Current Server** or **Server Choice** dropdown on the login screen or top navigation bar:
   - Select **Railway Cloud MySQL**.
   - **Username:** `root`
   - **Password:** Paste your Railway `MYSQLPASSWORD`.
3. Click **Log In**. You are now interacting directly with your live Railway cloud MySQL database!

---

### Method B: Deploy Cloud phpMyAdmin Service Directly on Railway (Zero-Config Web UI)

If you prefer a 100% cloud-hosted phpMyAdmin accessible from any browser anywhere (without editing local XAMPP files):

1. **Open your Railway Project:**
   - Go to [Railway Dashboard](https://railway.app/dashboard) and click your project.
2. **Add phpMyAdmin Service:**
   - Click **+ New** (top right) &rarr; **Docker Image**.
   - In the image field, type:
     ```
     phpmyadmin/phpmyadmin:latest
     ```
   - Press Enter. Railway will create a new service card.
3. **Configure Environment Variables:**
   - Click on the new `phpmyadmin` service &rarr; go to the **Variables** tab.
   - Click **+ New Variable** and add:

   | Variable Name | Value | Note |
   | :--- | :--- | :--- |
   | `PMA_HOST` | `${{MySQL.MYSQLHOST}}` | Uses Railway's internal private DNS (e.g. `mysql.railway.internal`) |
   | `PMA_PORT` | `3306` | Internal Railway private port |
   | `PMA_USER` | `root` | Default root user |
   | `PMA_PASSWORD`| `${{MySQL.MYSQLPASSWORD}}` | Pulls password automatically from MySQL service |
   | `UPLOAD_LIMIT`| `64M` | Allows importing large SQL dumps |

4. **Generate Public Domain:**
   - Go to the **Settings** tab of the `phpmyadmin` service.
   - Scroll down to **Networking** &rarr; click **Generate Domain**.
   - Railway will provide a public URL like:
     ```
     https://phpmyadmin-production-xxxx.up.railway.app
     ```
5. **Access phpMyAdmin:**
   - Click the generated URL.
   - Log in using `root` and your Railway MySQL password (or it may automatically sign you in via environment variables).

---

### Method C: Quick Desktop GUI Alternative (DBeaver / TablePlus / HeidiSQL)

If you want a native desktop GUI client to connect to Railway MySQL in 60 seconds:

1. Download [DBeaver Community](https://dbeaver.io/) or [HeidiSQL](https://www.heidisql.com/) (Free).
2. Create a new **MySQL** connection:
   - **Host:** Railway Public Host (e.g., `monorail.proxy.rlwy.net`)
   - **Port:** Railway Public Assigned Port (e.g., `45678`)
   - **Database:** `railway`
   - **Username:** `root`
   - **Password:** Railway `MYSQLPASSWORD`
3. Click **Test Connection** &rarr; **Finish**.

---

## 6. Part 4: Common Troubleshooting & Solutions

### 1. Port 3306 Conflict in XAMPP
- **Problem:** MySQL fails to start in XAMPP; log shows `Port 3306 in use by another program`.
- **Solution:** Another MySQL service is already running on Windows (e.g., official MySQL Server service):
  1. Press `Win + R`, type `services.msc`, press Enter.
  2. Locate `MySQL` or `MySQL80`.
  3. Right-click &rarr; **Stop** (and set Startup Type to **Manual**).
  4. Return to XAMPP Control Panel and click **Start** on MySQL.

---

### 2. Port 80 / 443 Conflict in XAMPP (Apache)
- **Problem:** Apache won't start; port 80/443 occupied.
- **Solution:** In XAMPP Control Panel, click **Config** next to Apache &rarr; `httpd.conf`:
  - Change `Listen 80` to `Listen 8080`.
  - Open phpMyAdmin via `http://localhost:8080/phpmyadmin`.

---

### 3. Missing PHP Extensions (`pdo_mysql`, `fileinfo`)
- **Problem:** Laravel throws `could not find driver` during migration.
- **Solution:**
  1. Open `C:\xampp\php\php.ini` in a text editor.
  2. Find and uncomment (remove the `;` at the beginning):
     ```ini
     extension=pdo_mysql
     extension=fileinfo
     extension=mbstring
     extension=openssl
     extension=curl
     ```
  3. Save `php.ini` and restart Apache/terminal.

---

### 4. CORS Error: Frontend Cannot Connect to Backend
- **Problem:** Browser console shows `blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present`.
- **Solution:**
  1. Check `backend\.env`: Ensure `FRONTEND_URL=http://localhost:5173`.
  2. Clear Laravel configuration cache:
     ```powershell
     cd backend
     php artisan config:clear
     ```
  3. Ensure `frontend\.env.development` has:
     ```ini
     VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
     ```

---

### 5. `APP_KEY` Missing Error
- **Problem:** Laravel displays `No application encryption key has been specified`.
- **Solution:**
  ```powershell
  cd backend
  php artisan key:generate
  ```

---

### 6. Resetting Local Database Anytime
To wipe, re-run all migrations, and repopulate fresh demo accounts at any time:
```powershell
cd backend
php artisan migrate:fresh --seed
```

---

*Documentation prepared for Walang Brownout Appliances Inventory Control System.*  
*For Railway production deployment steps, refer to [`Guide-Deployment.md`](Guide-Deployment.md).*
