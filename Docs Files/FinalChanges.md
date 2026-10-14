# Final Changes — UI Revision Log

**Project:** Walang Brownout Appliances — Inventory Control System  
**Subject:** CCS112 – Applications Development and Emerging Technologies  
**Institution:** Pamantasan ng Cabuyao (University of Cabuyao) – College of Computing Studies  
**Date:** October 14, 2026  

---

## Summary

This document records all UI and behavioral changes applied in this revision session. Changes span routing, search UX, sort functionality, modal consistency, supplier integration, and documentation updates.

---

## 1. Default Landing Page — All Roles Now Land on Dashboard

**File:** `frontend/src/context/AuthContext.jsx`

**Change:** `ROLE_HOME` map updated so that every role (`admin`, `manager`, `staff`) redirects to `/dashboard` after login.

**Before:**
```js
export const ROLE_HOME = {
  admin:   '/dashboard',
  manager: '/transactions',
  staff:   '/transactions',
};
```

**After:**
```js
export const ROLE_HOME = {
  admin:   '/dashboard',
  manager: '/dashboard',
  staff:   '/dashboard',
};
```

**Impact:** Manager and Staff users previously landed on `/transactions` after login. They now land on `/dashboard` along with Admin, giving a consistent first-view experience across all roles.

---

## 2. Login Page — Username Field (Confirmed, No Code Change)

**File:** `frontend/src/pages/Login.jsx`

**Status:** Already correct. The Sign In and Sign Up forms both use `type="text"` inputs with `placeholder="Username"`. No email field is present. No code change required.

**Demo Accounts documentation updated** in `Docs Files/Demo-Accounts.md` to:
- Reflect all roles now landing on `/dashboard`.
- Add a note under Quick Demo Accounts explicitly stating the login uses **Username**, not email.

---

## 3. New Transaction — Supplier Dropdown Added

**File:** `frontend/src/components/layout/TransactionDrawer.jsx`

**Change:** Added a `supplierId` field to the transaction form. When the transaction type is `Orders`, a **Supplier** dropdown appears populated from the `suppliers` list in `InventoryContext`. Selection is optional.

**Seeded suppliers (from `InventoryContext.jsx`):**
- CoolAire Distributors
- PureBreeze Supply Co.

The selected `supplierId` is passed through `createTransaction()` so it is stored on the transaction record.

---

## 4. New Transaction — Converted from Side Drawer to Centered Modal

**Files:**
- `frontend/src/components/layout/TransactionDrawer.jsx`
- `frontend/src/components/layout/TransactionDrawer.module.css`

**Change:** The "New Transaction" form was previously a right-side sliding drawer (`justify-content: flex-end`). It has been redesigned as a **centered pop-up modal**, consistent with the `ProductModal` component. 

The overlay now uses `align-items: center; justify-content: center` with a `popIn` animation identical to `ProductModal.module.css`. The form is wrapped in `FormPanel` for a consistent title bar, body, and footer button layout.

**UI Consistency:** Both "Add Product" and "New Transaction" now use the same centered modal pattern.

---

## 5. Products Page — Supplier Column Added (Tentative)

**File:** `frontend/src/pages/Products.jsx`

**Change:** A **Supplier** column has been added to the Products table between the Category and Unit Price columns. It renders `r.supplier` if present, otherwise displays `—`.

**Status:** Tentative. The `supplier` field is not yet part of `mockData.js` or the `addProduct` / `editProduct` flows. The column is ready to display data once the field is wired into the product model and the Add/Edit Product form.

---

## 6. Search Bar — Placeholder Changed to "Search by name"

**Files:**
- `frontend/src/pages/Products.jsx` — `searchPlaceholder="Search by name"`
- `frontend/src/pages/Transactions.jsx` — `searchPlaceholder="Search by name"`

**Change:** Both pages previously had different placeholder text (`"Search by name or id"` and `"Search transaction"` respectively). Unified to `"Search by name"` on both pages.

The Products search filter was also tightened to match only on `p.name` (removed `p.id` match). The Transactions search filter now matches only on `t.productName` (removed `t.id` match).

---

## 7. Sort By Button — Now Functional (Products Page)

**Files:**
- `frontend/src/components/layout/PageHeader.jsx`
- `frontend/src/components/layout/PageHeader.module.css`
- `frontend/src/pages/Products.jsx`

**Change:** The Sort By button on the Products page now opens a dropdown with three sort options:

| Option | Behavior |
| :--- | :--- |
| **Alphabetical (A–Z)** | Sorts products by name using `localeCompare` |
| **By Expiration Date** | Sorts by soonest expiry date first; products with no expiry go to the end |
| **ABC Category** | Sorts by category string using `localeCompare` |

A **Clear sort** option appears at the bottom of the dropdown when a sort is active. The Sort By button turns accent-colored when a sort is active to indicate the active state.

The dropdown closes automatically when clicking outside (via a `mousedown` listener).

**`PageHeader` is backward-compatible:** Pages that pass only `onSortClick` (no `sortOptions`) still render the old non-dropdown button.

---

## 8. Add New Product Button — Centered

**File:** `frontend/src/pages/ListPage.module.css`

**Change:** `.footerAction` changed from `justify-content: flex-end` to `justify-content: center` so the "Add New Product" button sits at the horizontal center of the page below the product table.

---

## Files Changed

| File | Change Type |
| :--- | :--- |
| `frontend/src/context/AuthContext.jsx` | Route redirect fix |
| `frontend/src/components/layout/TransactionDrawer.jsx` | Modal rewrite + supplier dropdown |
| `frontend/src/components/layout/TransactionDrawer.module.css` | Centered modal styles |
| `frontend/src/components/layout/PageHeader.jsx` | Sort By dropdown support |
| `frontend/src/components/layout/PageHeader.module.css` | Sort dropdown styles |
| `frontend/src/pages/Products.jsx` | Supplier column, search fix, sort wiring, centered button |
| `frontend/src/pages/Transactions.jsx` | Search placeholder fix |
| `frontend/src/pages/ListPage.module.css` | Center Add New Product button |
| `Docs Files/Demo-Accounts.md` | Updated landing page + username note |
| `Docs Files/FinalChanges.md` | **This file** — revision log |

---

## Pending / Tentative Items

| Item | Status | Notes |
| :--- | :--- | :--- |
| Supplier column in Products | ⚠️ Tentative | Column present; `supplier` field not yet in product model or Add/Edit form |
| Supplier on Transaction record | ⚠️ Partial | `supplierId` stored on transaction but not displayed in the Transactions table yet |
| Sort By on Transactions page | 🔜 Not yet | Transactions page `onSortClick` still a no-op; can follow the same pattern as Products |

---

*End of FinalChanges.md*
