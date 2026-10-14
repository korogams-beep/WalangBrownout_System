# Demo & Production Test Accounts

**Project:** Walang Brownout Appliances — Inventory Control System  
**Subject:** CCS112 – Applications Development and Emerging Technologies  
**Institution:** Pamantasan ng Cabuyao (University of Cabuyao) – College of Computing Studies  

---

## 1. Official System Demo Accounts

These 4 accounts are pre-configured in both the **MySQL database** (via `UserSeeder.php` / `php artisan db:seed`) and the frontend client authentication. You can sign in using either the **Username** or **Email Address**.

| Role | Username | Email | Password | Landing Page | Primary Permissions |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **System Administrator** | `Ais` | `ais@walangbrownout.com` | `WB@Pnc2026!` | `/dashboard` | **Full Access** — Product Catalog CRUD, batch additions/deletions, inventory adjustments, reorder rules, accounts management, and full audit logs. |
| **Inventory Manager** | `Brent` | `brent@walangbrownout.com` | `WB@Pnc2026!` | `/dashboard` | **Manager Access** — View all modules, edit catalog details, create new transactions, commit order reservations, and change transaction status. |
| **Warehouse Staff** | `Emerson` | `emerson@walangbrownout.com` | `WB@Pnc2026!` | `/dashboard` | **Operations Access** — View inventory & lots, pick stock using FIFO barcode scanning, receive lots, update transaction fulfillment status. |
| **Warehouse Staff 2** | `Ezra` | `ezra@walangbrownout.com` | `WB@Pnc2026!` | `/dashboard` | **Operations Access** — View inventory & lots, pick stock using FIFO barcode scanning, receive lots, update transaction fulfillment status. |

---

## 2. Role-Based Access Control (RBAC) Matrix

| Feature / Module | Administrator (`Ais`) | Inventory Manager (`Brent`) | Warehouse Staff (`Emerson` & `Ezra`) |
| :--- | :---: | :---: | :---: |
| **Dashboard & KPI Overview** | ✅ Full Access | ✅ View Only | ✅ View Only |
| **Product Catalog (View)** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Product Catalog (Create/Delete)** | ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **Product Catalog (Edit Details)** | ✅ Full Access | ✅ Allowed | ❌ Restricted |
| **Inventory Status & Live ATP** | ✅ Full Access | ✅ View | ✅ View |
| **Reorder Rules (Safety Stock/ROP)** | ✅ Full Control | ❌ View Only | ❌ View Only |
| **Receive New Batches (Lots)** | ✅ Full Access | ✅ Allowed | ✅ Allowed |
| **Commit Order Reservations** | ✅ Full Access | ✅ Allowed | ❌ Restricted |
| **Pick Barcode (FIFO Allocation)** | ✅ Full Access | ✅ Allowed | ✅ Allowed |
| **Cycle Count Adjustments** | ✅ Full Access | ✅ Allowed | ❌ Restricted |
| **Supplier Management (Add/Delete)** | ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **Supplier Management (Edit Details)**| ✅ Full Access | ✅ Allowed | ❌ Restricted |
| **Accounts Management (Admin Settings)**| ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **Audit Logs & Transaction History** | ✅ Full Access | ✅ View | ✅ View |

---

## 3. How to Log In

1. Open the application:
   - **Railway Production:** `https://wbimsfrontend-production.up.railway.app`
   - **Local Dev:** `http://localhost:5173`
2. Enter the **Username** (e.g. `Ais`, `Brent`, `Emerson`, `Ezra`) and Password: `WB@Pnc2026!`.
3. Click **Sign In**.
4. You will land directly on the **Dashboard** with the assigned role displayed in the sidebar navigation.
