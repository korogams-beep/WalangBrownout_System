# Role-based sign-up lockdown and Accounts Management in Settings

Four requirements were implemented together: the Sign Up form no longer exposes a role selector (every new account is unconditionally `staff`); a default `admin`/`admin123` seed account is present with `active: true`; three account-management actions (`updateUserRole`, `toggleUserActive`, `deleteUser`) plus the `registeredUsers` list are wired through `AuthContext`; and a new Accounts Management card appears in Settings gated by `isAdmin`. The build passes clean at zero errors.

Watch for: (1) **confirmed** — `login()` never checks the `active` flag, so deactivating an account through the new UI has no effect on login; (2) **confirmed** — `deleteUser()` has no guard against deleting the currently-authenticated admin, which would leave the app in a broken state with no admin account; (3) **confirmed** — the seed `admin123` password is hard-coded in plain text in client-side JS and documented in `Report-Change.md`; (4) **confirmed** — the CSS class added is `.accountsCard` but the JSX in Settings.jsx references `styles.accountsCard`, which matches; however the existing Account card above uses `styles.accountCard` (no 's'), a different class — this is correct but easy to confuse.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The Sign Up form changes are clean and complete — the role state, the dropdown JSX, and the reset calls are all removed; `register()` is called with the literal `'staff'` string. No role-selection surface remains.

`AuthContext` correctly seeds the admin account with `active: true` and exposes all three new actions and the `registeredUsers` list in the context value. The `active` flag is set on every new registration. However, `login()` was not updated to honour the flag — a deactivated user can still authenticate, making the Deactivate action in the UI cosmetically functional but behaviourally inert.

The Accounts Management card in Settings is gated correctly by `isAdmin` and follows the supplier modal pattern faithfully. The `DataTable` shows username, role (via `ROLE_LABEL`), and an Active/Inactive `StatusBadge`. The Change Role modal and Delete Account modal structure mirror the supplier modals exactly.

`deleteUser()` does not check whether the target is the currently logged-in user. An admin can delete their own account, removing it from `registeredUsers` while `user` still holds a session object. After a page reload or logout the admin account is gone and cannot be recovered because this is in-memory state. Absent a backend, this would require recreating the app; with a backend (Module 2) the risk is higher.

The `Report-Change.md` documents all five modified files accurately, including the `StatusBadge` additions, and records the build verification result. It is complete.

---

<details>
<summary>Issues (2)</summary>

1. **Deactivated accounts can still log in** — `login()` in `AuthContext.jsx` has no check for `found.active` before calling `setUser`. Add `if (!found.active) return { ok: false, message: 'Account is deactivated.' };` after the password check.

2. **Admin self-delete causes unrecoverable state** — `handleDeleteAccountConfirm` in Settings.jsx and `deleteUser` in AuthContext.jsx have no guard preventing deletion of the currently-authenticated user. At minimum, disable the Delete button (or return early) when `acct.username === user?.username`.

</details>

<details>
<summary>Details</summary>

### Deactivated accounts bypass login

`login()` looks up the user, validates the password, and immediately calls `setUser` — `found.active` is never read. The three-step sequence is:

```
found = registeredUsers.find(…)   // confirmed username
found.password !== password        // checked
found.active                       // never checked
```

Every account starts `active: true`, so this is invisible until an admin deactivates someone. Once deactivated through the Settings UI, that user can still authenticate. The `toggleUserActive` action is wired correctly in the data layer; the fix is a single guard in `login()`.

### Admin self-delete and session orphan

`handleDeleteAccountConfirm` calls `deleteUser(deleteAccountTarget.username)` with no comparison against `user.username`. The `deleteUser` action itself also contains no such guard. If the logged-in admin deletes their own account:

- `registeredUsers` no longer contains the admin entry
- `user` in context still holds `{ username: 'admin', role: 'admin', … }`
- The UI stays fully functional for the remainder of the session
- On logout, the admin account is permanently gone from the in-memory registry

Since the seed accounts are re-created only on a full page reload (React state re-initialization), a hard refresh would restore the seed, but only because this is a frontend-only prototype. The guard belongs in both places: `deleteUser` should reject `username === currentUser.username` (requires passing `user` into the action or checking in the handler), and the Delete button in the Actions column should be disabled when `acct.username === user?.username`.

### Hardcoded seed credentials in client-side bundle

`admin`/`admin123` and the other seed accounts are compiled into the JS bundle and documented in `Report-Change.md`. This is scoped as a frontend-only prototype ("Module 2 backend is out of scope"), so it is acceptable for now, but it should be called out explicitly in any handoff notes so it is not deployed as-is.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `src/pages/Login.jsx` | Removed role selector state, JSX dropdown, and reset calls; hardcoded `'staff'` in `register()` call |
| `src/context/AuthContext.jsx` | Added `active: true` to seed users and new registrations; added `updateUserRole`, `toggleUserActive`, `deleteUser`; exposed `registeredUsers` in context value |
| `src/pages/Settings.jsx` | Added Accounts Management card with `DataTable`, Change Role modal, and Delete Account modal, all gated by `isAdmin` |
| `src/pages/Settings.module.css` | Added `.accountsCard { margin-bottom: 18px }` |
| `src/components/ui/StatusBadge.jsx` | Added `'Active': 'green'` and `'Inactive': 'red'` to `STATUS_TONE` |
| `Report-Change.md` | Created; documents all five file changes and build verification |

Full diff: `git diff main` from the workspace root.

</details>
