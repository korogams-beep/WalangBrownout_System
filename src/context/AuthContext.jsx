import { createContext, useContext, useMemo, useState } from 'react';

// Frontend-only session + role state. Real authentication against
// Laravel/Sanctum is Module 2 (backend) scope; this just tracks who's
// "logged in" for the rest of the UI to gate screens/actions by:
//   - admin:   full access everywhere, no restrictions.
//   - manager: can VIEW every module, and on Transactions can both add a new
//              transaction (pop-up form) and change a transaction's status.
//   - staff:   can VIEW every module, but on Transactions can only change a
//              transaction's status — no adding new transactions.

export const ROLE_HOME = {
  admin: '/dashboard',
  manager: '/transactions',
  staff: '/transactions',
};

export const ROLE_LABEL = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
};

export const ROLE_OPTIONS = ['admin', 'manager', 'staff'];

// In-memory user registry — seed with demo accounts so the app works
// out of the box. A real backend (Module 2) would replace this entirely.
const INITIAL_USERS = [
  { username: 'admin', password: 'admin123', role: 'admin', active: true },
  { username: 'manager1', password: 'manager123', role: 'manager', active: true },
  { username: 'staff1', password: 'staff123', role: 'staff', active: true },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Registry of registered accounts (starts with seed accounts above).
  const [registeredUsers, setRegisteredUsers] = useState(INITIAL_USERS);

  const actions = useMemo(
    () => ({
      /**
       * login(username, password) — looks up the username in the registry,
       * validates the password, and sets the session.
       * Returns { ok: true } on success or { ok: false, message } on failure.
       */
      login: (username, password) => {
        const found = registeredUsers.find(
          (u) => u.username.toLowerCase() === username?.trim().toLowerCase()
        );
        if (!found) return { ok: false, message: 'Username not found.' };
        if (found.password !== password) return { ok: false, message: 'Incorrect password.' };
        setUser({
          username: found.username,
          role: found.role,
          loginTime: new Date().toISOString(),
        });
        return { ok: true, role: found.role };
      },

      /**
       * register(username, password, role) — adds a new account to the registry.
       * Returns { ok: true } on success or { ok: false, message } on failure.
       */
      register: (username, password, role) => {
        const trimmed = username?.trim();
        if (!trimmed) return { ok: false, message: 'Username is required.' };
        if (!password) return { ok: false, message: 'Password is required.' };
        if (!ROLE_OPTIONS.includes(role)) return { ok: false, message: 'Invalid role.' };
        const exists = registeredUsers.find(
          (u) => u.username.toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) return { ok: false, message: 'Username already taken.' };
        setRegisteredUsers((prev) => [...prev, { username: trimmed, password, role, active: true }]);
        return { ok: true };
      },

      logout: () => setUser(null),

      renameUser: (username) =>
        setUser((prev) => (prev ? { ...prev, username: username?.trim() || prev.username } : prev)),

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
       * Guards: cannot delete the currently logged-in user (self-deletion).
       * Returns { ok: false, message } when the guard triggers.
       */
      deleteUser: (username, currentUser) => {
        if (
          currentUser &&
          currentUser.username.toLowerCase() === username.toLowerCase()
        ) {
          return { ok: false, message: 'You cannot delete your own account.' };
        }
        setRegisteredUsers((prev) =>
          prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase())
        );
        return { ok: true };
      },
    }),
    [registeredUsers]
  );

  const value = useMemo(
    () => ({ user, registeredUsers, ...actions }),
    [user, registeredUsers, actions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}

// Central place for "who can do what" so every page checks the same rules.
// View access is open to any logged-in role — only these write actions differ.
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isStaff: role === 'staff',
    // Products / Settings reorder-rule management — Admin only.
    canManageCatalog: role === 'admin',
    // Transactions: adding a new one — Admin + Manager.
    canAddTransaction: role === 'admin' || role === 'manager',
    // Transactions: changing a status — Admin + Manager + Staff (anyone logged in).
    canChangeTransactionStatus: role === 'admin' || role === 'manager' || role === 'staff',
  };
}
