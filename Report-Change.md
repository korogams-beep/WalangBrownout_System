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
