# Implementation Plan

## Context

- **Project**: WalangBrownout Inventory System — React + Vite + CSS Modules + React Router
- **Build command**: `npm run build` (Vite)
- **Dev server**: `npm run dev`
- **No test framework** — verification is via `npm run build` (zero compile errors) and manual dev-server inspection
- **Files touched**: `src/pages/Login.jsx`, `src/context/AuthContext.jsx`, `src/pages/Settings.jsx`, `src/pages/Settings.module.css`, `Report-Change.md`

---

## Step 1 — Strip the role selector from Login.jsx and hardcode role as 'staff'

### What to do

1. **Remove the `ROLE_OPTIONS` and `ROLE_LABEL` imports** from the `useAuth` import line (line 6).  
   Keep only `useAuth`, `ROLE_HOME` in the import — they are still needed.  
   New import line:  
   ```js
   import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';
   ```

2. **Delete the `regRole` state declaration** (line 24):  
   ```js
   const [regRole, setRegRole] = useState('staff');
   ```

3. **Update `handleRegister`** (line 46) to pass the hardcoded string `'staff'` instead of `regRole`:  
   ```js
   const result = register(regUsername, regPassword, 'staff');
   ```

4. **Remove the `setRegRole('staff')` call** in `handleRegister`'s success path (line 54) — the state no longer exists.

5. **Update `switchMode`** — remove the `setRegRole('staff')` call at line 67.

6. **Delete the role-selector JSX block** in the register form (lines 98–107):  
   ```jsx
   <div className={styles.roleSelect}>
     <label className={styles.roleLabel} htmlFor="reg-role">Role</label>
     <select id="reg-role" ...>
       {ROLE_OPTIONS.map(...)}
     </select>
   </div>
   ```

### Files
- `src/pages/Login.jsx`

### Verify
Run `npm run build` from the project root — zero errors. Then `npm run dev` and navigate to the Sign Up tab: only Username, Password, Confirm Password, and Create Account are visible (no Role dropdown).

---

## Step 2 — Extend AuthContext.jsx with account-management actions

### What to do

The `INITIAL_USERS` array already has the admin seed user `{ username: 'admin', password: 'admin123', role: 'admin' }` — **do not remove or change it**.

The `registeredUsers` state must get an `active` flag so Settings can show active/inactive status. Add `active: true` to every entry in `INITIAL_USERS`:

```js
const INITIAL_USERS = [
  { username: 'admin',    password: 'admin123',  role: 'admin',   active: true },
  { username: 'manager1', password: 'manager123', role: 'manager', active: true },
  { username: 'staff1',   password: 'staff123',   role: 'staff',   active: true },
];
```

Update `register()` to also set `active: true` on new accounts:
```js
setRegisteredUsers((prev) => [...prev, { username: trimmed, password, role, active: true }]);
```

Add three new actions inside the `actions = useMemo(...)` block (alongside `login`, `register`, `logout`, `renameUser`):

```js
/**
 * updateUserRole(username, newRole) — changes a registered user's role.
 */
updateUserRole: (username, newRole) => {
  if (!ROLE_OPTIONS.includes(newRole)) return;
  setRegisteredUsers((prev) =>
    prev.map((u) =>
      u.username.toLowerCase() === username.toLowerCase() ? { ...u, role: newRole } : u
    )
  );
},

/**
 * toggleUserActive(username) — flips the active flag (deactivate/reactivate).
 */
toggleUserActive: (username) => {
  setRegisteredUsers((prev) =>
    prev.map((u) =>
      u.username.toLowerCase() === username.toLowerCase() ? { ...u, active: !u.active } : u
    )
  );
},

/**
 * deleteUser(username) — permanently removes a user from the registry.
 */
deleteUser: (username) => {
  setRegisteredUsers((prev) =>
    prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase())
  );
},
```

Expose `registeredUsers` and the three new actions in the context value object.  
Currently the `value` useMemo is `{ user, ...actions }`. Change it to:
```js
const value = useMemo(
  () => ({ user, registeredUsers, ...actions }),
  [user, registeredUsers, actions]
);
```

`registeredUsers` must be added to the dependency array alongside `user` and `actions`.

### Files
- `src/context/AuthContext.jsx`

### Verify
Run `npm run build` — zero errors. Then `npm run dev`, log in as admin, open Settings — no runtime crash on the Accounts Management section added in the next step.

---

## Step 3 — Add Accounts Management section to Settings.jsx

### What to do

**A. Extend the import from AuthContext** — add `registeredUsers`, `updateUserRole`, `toggleUserActive`, `deleteUser`, and `ROLE_OPTIONS` to the destructure from `useAuth()`:

```js
const {
  user,
  renameUser,
  registeredUsers,
  updateUserRole,
  toggleUserActive,
  deleteUser,
} = useAuth();
```

Also add `ROLE_OPTIONS` to the named import at the top of the file:
```js
import { useAuth, usePermissions, ROLE_LABEL, ROLE_OPTIONS } from '../context/AuthContext.jsx';
```

**B. Add account-management state variables** — place these after the existing supplier state declarations:

```js
// ── Account management ─────────────────────────────────────────────────
// roleModal: null = closed | user-object (open for role change)
const [roleModal, setRoleModal]           = useState(null);
const [roleDraft, setRoleDraft]           = useState('');
const [deleteAccountTarget, setDeleteAccountTarget] = useState(null);
```

**C. Add handler functions** — place them after the supplier handlers:

```js
function openRoleModal(account) {
  setRoleDraft(account.role);
  setRoleModal(account);
}

function handleRoleSubmit(e) {
  e.preventDefault();
  if (roleModal) {
    updateUserRole(roleModal.username, roleDraft);
    setRoleModal(null);
  }
}

function handleDeleteAccountConfirm() {
  if (deleteAccountTarget) {
    deleteUser(deleteAccountTarget.username);
    setDeleteAccountTarget(null);
  }
}
```

**D. Add the Accounts Management Card** — insert it immediately after the existing Supplier Management `{isAdmin && (...)}` block (and before the Automated Reorder Rules Card). Follow the exact same `{isAdmin && (<Card>...</Card>)}` pattern:

```jsx
{/* ── Accounts Management — Admin only ───────────────────────── */}
{isAdmin && (
  <Card
    title="Accounts Management"
    className={styles.accountsCard}
  >
    <p className={styles.helperText}>
      Manage all registered accounts. Only Admins can view and edit this section.
    </p>
    <DataTable
      rowKey="username"
      rows={registeredUsers}
      emptyMessage="No accounts found."
      columns={[
        { key: 'username', header: 'Username' },
        {
          key: 'role',
          header: 'Role',
          render: (acct) => ROLE_LABEL[acct.role] ?? acct.role,
        },
        {
          key: 'active',
          header: 'Status',
          render: (acct) => (
            <StatusBadge status={acct.active ? 'Active' : 'Inactive'} />
          ),
        },
        {
          key: '_actions',
          header: 'Actions',
          align: 'right',
          render: (acct) => (
            <span className={styles.supplierActions}>
              <button
                type="button"
                className={styles.supplierActionBtn}
                title="Change role"
                onClick={() => openRoleModal(acct)}
              >
                <EditIcon width={14} height={14} />
                Role
              </button>
              <button
                type="button"
                className={styles.supplierActionBtn}
                title={acct.active ? 'Deactivate account' : 'Reactivate account'}
                onClick={() => toggleUserActive(acct.username)}
              >
                {acct.active ? 'Deactivate' : 'Reactivate'}
              </button>
              <button
                type="button"
                className={`${styles.supplierActionBtn} ${styles.supplierActionBtnDelete}`}
                title="Delete account"
                onClick={() => setDeleteAccountTarget(acct)}
              >
                <TrashIcon width={14} height={14} />
                Delete
              </button>
            </span>
          ),
        },
      ]}
    />
  </Card>
)}
```

**E. Add the Role Change modal** — insert it in the modals section at the bottom of the JSX (after the Delete Supplier confirmation modal). Mirror the supplier modal pattern exactly:

```jsx
{/* ── Change Role modal ───────────────────────────────────────── */}
{roleModal !== null && (
  <div className={styles.modalOverlay} onClick={() => setRoleModal(null)}>
    <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
      <h3 className={styles.modalTitle}>Change Role — {roleModal.username}</h3>
      <form onSubmit={handleRoleSubmit}>
        <div className={styles.modalBody}>
          <label className={styles.modalLabel}>
            New Role
            <select
              className={styles.modalInput}
              value={roleDraft}
              onChange={(e) => setRoleDraft(e.target.value)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.modalFooter}>
          <Button type="button" variant="secondary" onClick={() => setRoleModal(null)}>
            Cancel
          </Button>
          <Button type="submit" variant="accent">
            Save Role
          </Button>
        </div>
      </form>
    </div>
  </div>
)}

{/* ── Delete Account confirmation ──────────────────────────────── */}
{deleteAccountTarget && (
  <div className={styles.modalOverlay} onClick={() => setDeleteAccountTarget(null)}>
    <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
      <h3 className={styles.modalTitle}>Delete Account?</h3>
      <p className={styles.modalBody}>
        <strong>{deleteAccountTarget.username}</strong> will be permanently removed.
        This cannot be undone.
      </p>
      <div className={styles.modalFooter}>
        <Button variant="secondary" onClick={() => setDeleteAccountTarget(null)}>Cancel</Button>
        <Button variant="danger" onClick={handleDeleteAccountConfirm}>Delete</Button>
      </div>
    </div>
  </div>
)}
```

### Files
- `src/pages/Settings.jsx`

### Verify
Run `npm run build` — zero errors. Then `npm run dev`, log in as admin (`admin` / `admin123`), navigate to Settings. Confirm the Accounts Management card appears with a table listing admin, manager1, and staff1, each with Role, Status, and action buttons. Log in as staff1 — confirm the Accounts Management card is NOT shown.

---

## Step 4 — Add `.accountsCard` CSS class to Settings.module.css

### What to do

Append the following block at the end of `src/pages/Settings.module.css` under the existing Supplier Management section. It mirrors `.supplierCard` exactly:

```css
/* ── Accounts Management ─────────────────────────────────────────────── */
.accountsCard {
  margin-bottom: 18px;
}
```

Also add `Active` and `Inactive` status tones to `src/components/ui/StatusBadge.jsx` so they render with correct colours. Append to the `STATUS_TONE` map:

```js
'Active':   'green',
'Inactive': 'red',
```

### Files
- `src/pages/Settings.module.css`
- `src/components/ui/StatusBadge.jsx`

### Verify
Run `npm run build` — zero errors. In the dev server, the Accounts Management card has proper spacing and the Status column shows green "Active" / red "Inactive" badges.

---

## Step 5 — Create/update Report-Change.md

### What to do

Create `Report-Change.md` at the project root (`c:\Users\Admin\WalangBrownout_UI-UX\Report-Change.md`).

The file must document every changed file with:
- **File path**
- **What was changed** (specific additions/removals/edits)
- **Why** (which requirement it satisfies)

Outline of required sections:

```
# Report-Change.md

## Summary
Brief one-paragraph overview of all changes made.

## Changes

### src/pages/Login.jsx
- Removed: `ROLE_OPTIONS` and `ROLE_LABEL` from import
- Removed: `regRole` state (`useState('staff')`)
- Removed: role-selector `<div className={styles.roleSelect}>` block (label + select)
- Removed: `setRegRole('staff')` resets in handleRegister and switchMode
- Changed: `register(regUsername, regPassword, regRole)` → `register(regUsername, regPassword, 'staff')`
- Why: Requirement 1 — remove staff options from Sign Up; default role is always staff.

### src/context/AuthContext.jsx
- Added: `active: true` field to every entry in INITIAL_USERS (including the seeded admin account)
- Added: `active: true` in register() for new accounts
- Added: `updateUserRole(username, newRole)` action
- Added: `toggleUserActive(username)` action
- Added: `deleteUser(username)` action
- Added: `registeredUsers` exposed in context value
- Why: Requirement 2 & 3 — expose account list and management actions for the Settings admin panel; confirm admin seed account is preserved.

### src/pages/Settings.jsx
- Added: `ROLE_OPTIONS` to import from AuthContext
- Added: `registeredUsers`, `updateUserRole`, `toggleUserActive`, `deleteUser` destructured from useAuth()
- Added: `roleModal`, `roleDraft`, `deleteAccountTarget` state variables
- Added: `openRoleModal`, `handleRoleSubmit`, `handleDeleteAccountConfirm` handlers
- Added: Accounts Management Card (admin-gated, `{isAdmin && ...}`) with DataTable listing all accounts
- Added: Change Role modal (follows supplier modal pattern)
- Added: Delete Account confirmation modal
- Why: Requirement 3 — Accounts Management section visible only to Admin.

### src/pages/Settings.module.css
- Added: `.accountsCard` class (mirrors `.supplierCard`)
- Why: Provides correct spacing for the new Accounts Management card.

### src/components/ui/StatusBadge.jsx
- Added: `'Active': 'green'` and `'Inactive': 'red'` to STATUS_TONE
- Why: Needed to render active/inactive status badges in the Accounts Management table.
```

### Files
- `Report-Change.md` (project root)

### Verify
File exists at project root and every changed file is documented with what changed and why. Run `npm run build` — still zero errors (no code changes in this step).

---

## Dependency order

Steps must be executed in order:

1. **Step 1** — Login.jsx changes are self-contained; no dependencies.
2. **Step 2** — AuthContext.jsx must be done before Step 3, because Settings.jsx will import `registeredUsers` and the three new actions.
3. **Step 3** — Depends on Step 2 (new context exports).
4. **Step 4** — CSS and StatusBadge additions can be done in parallel with Step 3 or immediately after; Settings.jsx uses the new class name.
5. **Step 5** — Depends on all previous steps being complete so the documentation is accurate.

Each step leaves the codebase in a buildable state. `npm run build` must pass after every step before moving to the next.
