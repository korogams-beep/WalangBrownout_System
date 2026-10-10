import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Frontend-only session + role state. Supports both demo accounts and
// backend testing credentials (from UserSeeder.php) for a seamless experience:
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

// In-memory user registry default seed — includes standard demo accounts
// and backend testing accounts so either set of credentials works out of the box.
const INITIAL_USERS = [
  { username: 'admin', password: 'admin123', role: 'admin', active: true },
  { username: 'manager1', password: 'manager123', role: 'manager', active: true },
  { username: 'staff1', password: 'staff123', role: 'staff', active: true },
  { username: 'admin@walangbrownout.com', password: 'Admin@WB2026!', role: 'admin', active: true },
  { username: 'staff@walangbrownout.com', password: 'Staff@WB2026!', role: 'staff', active: true },
];

const USERS_STORAGE_KEY = 'wb_registered_users';
const SESSION_STORAGE_KEY = 'wb_auth_user';

function loadStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return INITIAL_USERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge in any initial accounts that might not be in localStorage yet
      const existing = new Set(parsed.map((u) => u.username.toLowerCase()));
      const merged = [...parsed];
      for (const init of INITIAL_USERS) {
        if (!existing.has(init.username.toLowerCase())) {
          merged.push(init);
        }
      }
      return merged;
    }
  } catch (err) {
    console.error('Failed to load users from localStorage', err);
  }
  return INITIAL_USERS;
}

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredSession);
  // Registry of registered accounts with localStorage persistence
  const [registeredUsers, setRegisteredUsers] = useState(loadStoredUsers);

  // Persist registered users across page refreshes and logouts
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(registeredUsers));
    } catch (err) {
      console.error('Failed to persist users to localStorage', err);
    }
  }, [registeredUsers]);

  // Persist logged-in user session
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to persist session to localStorage', err);
    }
  }, [user]);

  const actions = useMemo(
    () => ({
      /**
       * login(username, password) — looks up the username in the registry,
       * validates the password, ensures the account is active, and sets the session.
       * Returns { ok: true } on success or { ok: false, message } on failure.
       */
      login: (username, password) => {
        const found = registeredUsers.find(
          (u) => u.username.toLowerCase() === username?.trim().toLowerCase()
        );
        if (!found) return { ok: false, message: 'Username not found.' };
        if (found.password !== password) return { ok: false, message: 'Incorrect password.' };
        if (!found.active) {
          return { ok: false, message: 'This account has been deactivated. Please contact an administrator.' };
        }
        const session = {
          username: found.username,
          role: found.role,
          loginTime: new Date().toISOString(),
        };
        setUser(session);
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

      renameUser: (username) => {
        const newName = username?.trim();
        if (!newName) return;
        setUser((prev) => (prev ? { ...prev, username: newName } : prev));
        setRegisteredUsers((prev) =>
          prev.map((u) =>
            user && u.username.toLowerCase() === user.username.toLowerCase()
              ? { ...u, username: newName }
              : u
          )
        );
      },

      /**
       * updateUserRole(username, newRole) — changes a registered user's role.
       * If that user is currently logged in, updates their session role immediately.
       */
      updateUserRole: (username, newRole) => {
        if (!ROLE_OPTIONS.includes(newRole)) return { ok: false, message: 'Invalid role.' };
        setRegisteredUsers((prev) =>
          prev.map((u) =>
            u.username.toLowerCase() === username.toLowerCase() ? { ...u, role: newRole } : u
          )
        );
        setUser((curr) =>
          curr && curr.username.toLowerCase() === username.toLowerCase()
            ? { ...curr, role: newRole }
            : curr
        );
        return { ok: true };
      },

      /**
       * toggleUserActive(username, currentUser) — flips the active flag (deactivate/reactivate).
       * Guards against self-deactivation.
       */
      toggleUserActive: (username, currentUser) => {
        if (
          currentUser &&
          currentUser.username.toLowerCase() === username.toLowerCase()
        ) {
          return { ok: false, message: 'You cannot deactivate your own account.' };
        }
        setRegisteredUsers((prev) =>
          prev.map((u) =>
            u.username.toLowerCase() === username.toLowerCase() ? { ...u, active: !u.active } : u
          )
        );
        return { ok: true };
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
    [registeredUsers, user]
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
    // Products / Settings route-level guard — Admin only (used by RequireRole in App.jsx).
    canManageCatalog: role === 'admin',
    // Products: granular in-page controls.
    canAddProduct: role === 'admin',
    canEditProduct: role === 'admin' || role === 'manager',
    canDeleteProduct: role === 'admin',
    // Suppliers: granular in-page controls.
    canViewSuppliers: role === 'admin' || role === 'manager' || role === 'staff',
    canAddSupplier: role === 'admin',
    canEditSupplier: role === 'admin' || role === 'manager',
    canDeleteSupplier: role === 'admin',
    // Accounts Management — Admin only.
    canManageAccounts: role === 'admin',
    // Reorder Rules management — Admin only.
    canManageReorderRules: role === 'admin',
    // Transactions: adding a new one — Admin + Manager.
    canAddTransaction: role === 'admin' || role === 'manager',
    // Transactions: changing a status — Admin + Manager + Staff (anyone logged in).
    canChangeTransactionStatus: role === 'admin' || role === 'manager' || role === 'staff',
  };
}
