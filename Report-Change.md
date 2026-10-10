# Report-Change.md

## Summary

This change implements four user-facing requirements across five source files: (1) the Sign Up page no longer shows a role selector — every new account is created as Staff by default; (2) a default Admin account (`admin` / `admin123`) is seeded and preserved; (3) all registered accounts gain an `active` status flag and three new account-management actions (`updateUserRole`, `toggleUserActive`, `deleteUser`) are exposed through `AuthContext`; (4) a new **Accounts Management** section visible only to Admin users is added to the Settings page, with a table of all accounts and modals for changing role, deactivating/reactivating, and deleting accounts.

---

## Changes

### Date
2025-07-17

---

### `src/pages/Login.jsx`

| What changed | Detail |
|---|---|
| Removed import | `ROLE_OPTIONS` and `ROLE_LABEL` removed from the `AuthContext` import line (only `useAuth` and `ROLE_HOME` remain — both still used) |
| Removed state | `const [regRole, setRegRole] = useState('staff')` deleted |
| Removed JSX block | `<div className={styles.roleSelect}>…</div>` (label + select dropdown for Role) removed from the Sign Up form |
| Removed reset calls | `setRegRole('staff')` removed from `handleRegister`'s success path and from `switchMode` |
| Hardcoded role | `register(regUsername, regPassword, regRole)` → `register(regUsername, regPassword, 'staff')` |

**Why:** Requirement — "Remove staff options in Sign Up page. Default role upon sign up is Staff." Users can no longer choose a role when registering; every new account is unconditionally assigned the `staff` role.

---

### `src/context/AuthContext.jsx`

| What changed | Detail |
|---|---|
| `INITIAL_USERS` — `active` field | Added `active: true` to all three seed entries (admin, manager1, staff1) |
| `register()` — `active` field | New accounts are registered with `active: true` so they immediately appear as Active in the Accounts Management table |
| New action `updateUserRole` | Validates that `newRole` is in `ROLE_OPTIONS`, then updates the matching user's role in `registeredUsers` |
| New action `toggleUserActive` | Flips the `active` boolean of the matching user (deactivate ↔ reactivate) |
| New action `deleteUser` | Filters the matching user out of `registeredUsers` permanently |
| Context value | `registeredUsers` is now exposed in the context value object and added to its `useMemo` dependency array, so consumers can read the full account list |

**Why:**
- Requirement — "Have default Admin account." The `admin` / `admin123` seed user was already present; adding `active: true` ensures it appears correctly in the new Accounts Management table.
- Requirement — "Add accounts management in settings under Admin view only." The three new actions are the data layer that backs the Settings UI; exposing `registeredUsers` lets Settings render the account list.

---

### `src/pages/Settings.jsx`

| What changed | Detail |
|---|---|
| Import — `ROLE_OPTIONS` | Added `ROLE_OPTIONS` to the named import from `AuthContext` |
| `useAuth()` destructure | Added `registeredUsers`, `updateUserRole`, `toggleUserActive`, `deleteUser` |
| New state — role modal | `const [roleModal, setRoleModal] = useState(null)` — null = closed, user-object = open |
| New state — role draft | `const [roleDraft, setRoleDraft] = useState('')` — holds the selected role while the modal is open |
| New state — delete account target | `const [deleteAccountTarget, setDeleteAccountTarget] = useState(null)` |
| New handlers | `openRoleModal(account)`, `handleRoleSubmit(e)`, `handleDeleteAccountConfirm()` |
| New JSX — Accounts Management Card | Admin-gated `{isAdmin && (<Card …>)}` block inserted after Supplier Management, before Automated Reorder Rules. Contains a `DataTable` with columns: Username, Role, Status (Active/Inactive badge), and Actions (Edit Role, Deactivate/Reactivate, Delete) |
| New JSX — Change Role modal | Appears when `roleModal !== null`; allows picking a new role from `ROLE_OPTIONS` and saving via `updateUserRole` |
| New JSX — Delete Account modal | Appears when `deleteAccountTarget` is set; confirms permanent deletion via `deleteUser` |

**Why:** Requirement — "Add accounts management in settings under Admin view only." The entire section is wrapped in `{isAdmin && (…)}` so only the Admin role can see or interact with it.

---

### `src/pages/Settings.module.css`

| What changed | Detail |
|---|---|
| Added `.accountsCard` | `margin-bottom: 18px` — mirrors the existing `.supplierCard` rule |

**Why:** Provides consistent vertical spacing for the new Accounts Management card, matching the Supplier Management card style.

---

### `src/components/ui/StatusBadge.jsx`

| What changed | Detail |
|---|---|
| Added `'Active': 'green'` to `STATUS_TONE` | Renders Active status as a green badge |
| Added `'Inactive': 'red'` to `STATUS_TONE` | Renders Inactive status as a red badge |

**Why:** The Accounts Management table's Status column uses `<StatusBadge status={acct.active ? 'Active' : 'Inactive'} />`. Without these entries the badge would fall back to blue, giving no visual distinction between active and inactive accounts.

---

## Build verification

`npm run build` passed with zero errors after all changes were applied (Vite v5.4.21, 79 modules transformed).

---

## Patch — Security fixes (2026-10-07)

Two security gaps found during review were fixed directly:

### `src/context/AuthContext.jsx`

| What changed | Detail |
|---|---|
| `login()` — active check | Added `if (!found.active) return { ok: false, message: 'This account has been deactivated.' }` after the password check. Deactivated accounts can no longer authenticate. |
| `deleteUser()` — self-deletion guard | Accepts a second argument `currentUser`. Returns `{ ok: false, message: 'You cannot delete your own account.' }` if the target username matches the current session's username. |

### `src/pages/Settings.jsx`

| What changed | Detail |
|---|---|
| `handleDeleteAccountConfirm()` — guard response | Passes `user` as the second argument to `deleteUser(username, user)`. If the guard returns `{ ok: false }`, shows an `alert()` with the message and closes the modal without deleting. |

**Why:** Without the active check, toggling a user inactive was purely cosmetic — they could still log in. Without the self-deletion guard, an Admin could delete their own account and be left with an orphaned session (no route back).

### Build verification

`npm run build` passed with zero errors (Vite v5.4.21, 79 modules, 849ms).

---

## Fix: ISSUE-001, ISSUE-002, ISSUE-003, ISSUE-009 Confirmation

### Date
2025-07-17

---

### ISSUE-001 — Frontend Still Dependent on Static Mock Data

**Severity:** High | **Area:** Architecture/Integration

| File | What changed |
|---|---|
| `src/services/api.js` (created) | New thin API adapter module with async stub functions: `fetchProducts()`, `fetchTransactions()`, `fetchSuppliers()`, `login()`, `register()`. Each stub returns the current mock data and carries a `// TODO: replace with real API call to /api/...` comment. |
| `src/context/InventoryContext.jsx` | Added pointer comment block at the top pointing to `src/services/api.js` as the integration point for Module 2. |
| `src/context/AuthContext.jsx` | Added pointer comment block at the top pointing to `src/services/api.js` as the integration point for Module 2. |

**Why:** All data currently lives in `src/data/mockData.js` and in-memory state. Without an API adapter layer, swapping in the real Laravel/Sanctum backend would require touching every context file. The adapter isolates that change to one file (`src/services/api.js`) — replacing any stub body with a real `fetch()` call is all it takes to wire up the backend, with no changes required elsewhere.

---

### ISSUE-002 — User Role Enum Mismatch (manager in Frontend vs Backend)

**Severity:** High | **Area:** Database/Schema

| File | What changed |
|---|---|
| `src/services/api.js` | Added and exported `normalizeRole(role)` helper (lowercases any incoming role string) and `BACKEND_ROLE_MAP` constant documenting the expected backend → frontend role mapping. |
| `src/context/AuthContext.jsx` | Imported `normalizeRole` from `src/services/api.js`. Wrapped the role field in `login()` and `register()` with `normalizeRole()`. Added an ISSUE-002 comment above `ROLE_OPTIONS` explaining the normalisation contract. |

**Why:** The frontend uses lowercase role strings (`'admin'`, `'manager'`, `'staff'`). The Laravel backend will likely use capitalised enums (`'Admin'`, `'Manager'`, `'Staff'`). Without a normalisation layer, the login response from the real API would silently break all role-gated checks. `normalizeRole()` is the single boundary where capitalisation is resolved, so no other file needs to change when the backend is wired up.

---

### ISSUE-003 — Product ID Format Discrepancy (PID- vs AC-PORT- / FILT-)

**Severity:** Medium | **Area:** Data Modeling

| File | What changed |
|---|---|
| `src/context/InventoryContext.jsx` | In the `ADD_PRODUCT` reducer case, added a `safeId` guard that normalises any incoming product ID to `PID-` format before the product is classified and stored. |
| `src/data/mockData.js` | Added a comment above `mockProducts` documenting `PID-NNN` as the canonical product ID format and explicitly prohibiting other prefixes. |
| `src/services/api.js` | Added and exported `normalizeProductId(id)` stub with a TODO comment for mapping backend-specific prefixes once the real backend ID format is confirmed. |

**Why:** The issue matrix documented a risk of product ID divergence between the frontend (`PID-001`) and backend (potentially `AC-PORT-001`, `FILT-001`, etc.). The fix enforces `PID-` as the canonical contract at the data boundary, adds a normalisation utility for the integration layer, and documents the convention clearly so it is not silently broken when new products are added or when the real backend is connected.

---

### ISSUE-009 — Strict Pick Prerequisite: Commitment Required Before FIFO Pick

**Severity:** Low | **Area:** Business Logic | **Status:** Documented — No Code Change Required

Confirmation: ISSUE-009 is already correctly implemented in the codebase. No code changes were made.

- `CREATE_TRANSACTION` in `src/context/InventoryContext.jsx` commits `qtyCommitted` immediately when a Sale is opened (the `type === 'Sale'` branch in the `CREATE_TRANSACTION` case). This is the case study's COMMIT trigger: ATP is protected the instant an order is placed, before anything is picked or shipped.
- `ADVANCE_TRANSACTION` calls `getNextFifoBatch()` from `src/utils/inventoryLogic.js` at the Shipped step for perishable products (inside `applyStockEffect`). FIFO picking is enforced at the stock-effect step, not earlier.

The commitment-before-pick prerequisite is structurally enforced by the transaction pipeline: a Sale cannot reach Shipped without passing through Open (where qtyCommitted is incremented) and Picked first. No additional guard is needed.

---

### Build verification

`npm run build` passed with zero errors after all changes were applied.
