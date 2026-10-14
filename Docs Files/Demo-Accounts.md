# Demo & Production Test Accounts

**Project:** Walang Brownout Appliances — Inventory Control System  
**Subject:** CCS112 – Applications Development and Emerging Technologies  
**Institution:** Pamantasan ng Cabuyao (University of Cabuyao) – College of Computing Studies  

---

## 1. System Role Accounts (Live API & Railway Production)

These accounts are seeded into the MySQL database via `UserSeeder.php` (`php artisan db:seed --force`) and work on both the **Railway Production** live environment and local Laravel API (`http://127.0.0.1:8000`).

| Role | Username / Email | Password | Default Landing Page | Primary Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@walangbrownout.com` | `Admin@WB2026!` | `/dashboard` | **Full Access** — Product Catalog CRUD, batch additions/deletions, inventory adjustments, reorder rules, and full audit logs. |
| **Inventory Manager** | `manager@walangbrownout.com` | `Manager@WB2026!` | `/dashboard` | **Manager Access** — View all modules, create new transactions, commit order reservations, and change transaction status. |
| **Warehouse Staff** | `staff@walangbrownout.com` | `Staff@WB2026!` | `/dashboard` | **Operations Access** — View inventory & lots, pick stock using FIFO barcode scanning, update transaction fulfillment status. |

---

## 2. Team Member Accounts (CCS112 Evaluation)

Individual team accounts configured for project grading and faculty demonstration:

| Name | Email / Username | Password | Assigned Role |
| :--- | :--- | :--- | :---: |
| **Facistol, Eazra Eliel R.** | `facistol@walangbrownout.com` | `WB@Pnc2026!` | `admin` |
| **Gamalo, Brent Harold R.** | `gamalo@walangbrownout.com` | `WB@Pnc2026!` | `admin` |
| **Guevarra, Jan Emerson C.** | `guevarra@walangbrownout.com` | `WB@Pnc2026!` | `staff` |
| **Intia, Ais B.** | `intia@walangbrownout.com` | `WB@Pnc2026!` | `staff` |

---

## 3. Quick Demo Accounts (Offline / Mock Mode)

For quick UI testing without requiring full backend connection or when running frontend mock mode. Log in using **Username** (not email) on the login page.

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Manager** | `manager1` | `manager123` |
| **Staff** | `staff1` | `staff123` |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Feature / Module | Administrator (`admin`) | Inventory Manager (`manager`) | Warehouse Staff (`staff`) |
| :--- | :---: | :---: | :---: |
| **Dashboard & KPI Overview** | ✅ Full Access | ✅ View Only | ✅ View Only |
| **Product Catalog (View)** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Product Catalog (Create/Edit/Delete)** | ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **Inventory Status & Live ATP** | ✅ Full Access | ✅ View | ✅ View |
| **Reorder Rules (Safety Stock/ROP)** | ✅ Full Control | ❌ View Only | ❌ View Only |
| **Receive New Batches (Lots)** | ✅ Full Access | ✅ Allowed | ✅ Allowed |
| **Exhausted Batch Deletion** | ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **Commit Order Reservations** | ✅ Full Access | ✅ Allowed | ❌ Restricted |
| **Pick Barcode (FIFO Allocation)** | ✅ Full Access | ✅ Allowed | ✅ Allowed |
| **Cycle Count Adjustments** | ✅ Full Access | ✅ Allowed | ❌ Restricted |
| **Audit Logs & Transaction History** | ✅ Full Access | ✅ View | ✅ View |

---

## 5. How to Log In

1. Open the application in your browser:
   - **Railway Production:** `https://<your-frontend-domain>.up.railway.app`
   - **Local Dev:** `http://localhost:5173`
2. Enter any of the credentials listed above.
3. Upon authentication, you will be redirected to `/dashboard` regardless of role.
4. The active role badge is displayed in the navigation sidebar.
