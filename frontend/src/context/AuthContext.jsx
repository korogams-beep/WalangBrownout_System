import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  apiLogin,
  apiRegister,
  apiLogout,
  apiGetUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
  getApiErrorMessage,
} from '../services/api.js';

// Session + role state with live MySQL database synchronization.
// Supports both demo accounts and live MySQL database users for a seamless experience:
//   - admin:   full access everywhere, no restrictions.
//   - manager: can VIEW every module, and on Transactions can both add a new
//              transaction (pop-up form) and change a transaction's status.
//   - staff:   can VIEW every module, but on Transactions can only change a
//              transaction's status — no adding new transactions.

export const ROLE_HOME = {
  admin: '/dashboard',
  manager: '/dashboard',
  staff: '/dashboard',
};

export const ROLE_LABEL = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
};

export const ROLE_OPTIONS = ['admin', 'manager', 'staff'];

// 4 Official System Demo Accounts
const INITIAL_USERS = [
  { id: 1, username: 'Ais',     password: 'WB@Pnc2026!', role: 'admin',   active: true, email: 'ais@walangbrownout.com' },
  { id: 2, username: 'Brent',   password: 'WB@Pnc2026!', role: 'manager', active: true, email: 'brent@walangbrownout.com' },
  { id: 3, username: 'Emerson', password: 'WB@Pnc2026!', role: 'staff',   active: true, email: 'emerson@walangbrownout.com' },
  { id: 4, username: 'Ezra',    password: 'WB@Pnc2026!', role: 'staff',   active: true, email: 'ezra@walangbrownout.com' },
];

const USERS_STORAGE_KEY = 'wb_users_v3';
const SESSION_STORAGE_KEY = 'wb_auth_user';

function loadStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return INITIAL_USERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Remove any old legacy accounts if present
      const cleaned = parsed.filter(
        (u) =>
          !['admin', 'manager1', 'staff1', 'admin@walangbrownout.com', 'manager@walangbrownout.com', 'staff@walangbrownout.com'].includes(
            (u.username || '').toLowerCase()
          )
      );
      return cleaned.length > 0 ? cleaned : INITIAL_USERS;
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
  const [registeredUsers, setRegisteredUsers] = useState(loadStoredUsers);

  // Sync users with live MySQL database whenever authenticated or on initial mount
  useEffect(() => {
    let mounted = true;

    async function syncFromDatabase() {
      try {
        const dbUsers = await apiGetUsers();
        if (mounted && Array.isArray(dbUsers) && dbUsers.length > 0) {
          // Live database accounts take full precedence
          setRegisteredUsers(dbUsers);
        }
      } catch (err) {
        // Fallback to local demo accounts if API is not reachable
      }
    }

    syncFromDatabase();
    return () => {
      mounted = false;
    };
  }, [user]);

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
       * login(username, password) — authenticates via Laravel MySQL API.
       * Falls back to local registry ONLY if server is completely unreachable (offline).
       */
      login: async (username, password) => {
        const trimmed = username?.trim();
        if (!trimmed) return { ok: false, message: 'Please enter a username or email.' };
        if (!password) return { ok: false, message: 'Please enter a password.' };

        // 1. Attempt live API login with MySQL
        try {
          const res = await apiLogin(trimmed, password);
          if (res?.user) {
            const session = {
              id: res.user.id,
              username: res.user.name || res.user.email,
              name: res.user.name || res.user.email,
              role: res.user.role,
              email: res.user.email,
              active: res.user.active ?? true,
              loginTime: new Date().toISOString(),
            };
            setUser(session);
            return { ok: true, role: res.user.role };
          }
        } catch (apiErr) {
          // If the server responded (422 wrong credentials, 403 deactivated, 401, etc.),
          // this is an authoritative response from MySQL — NEVER bypass it or fall back!
          if (apiErr.response) {
            const message = getApiErrorMessage(apiErr, 'Invalid credentials.');
            return { ok: false, message };
          }
          console.warn('Backend API unreachable, checking offline fallback:', apiErr.message);
        }

        // 2. Fallback to local demo accounts ONLY if API server is completely offline (network down)
        const found = INITIAL_USERS.find(
          (u) =>
            u.username.toLowerCase() === trimmed.toLowerCase() ||
            (u.email && u.email.toLowerCase() === trimmed.toLowerCase())
        );
        if (!found) return { ok: false, message: 'Cannot connect to server, and account not found locally.' };
        if (!found.password || found.password !== password) {
          return { ok: false, message: 'The provided credentials are incorrect.' };
        }
        if (!found.active) {
          return { ok: false, message: 'This account has been deactivated. Please contact an administrator.' };
        }
        const session = {
          id: found.username,
          username: found.username,
          name: found.username,
          role: found.role,
          email: found.email,
          loginTime: new Date().toISOString(),
        };
        setUser(session);
        return { ok: true, role: found.role };
      },

      /**
       * register(username, password, role) — adds new account to MySQL database!
       */
      register: async (username, password, role = 'staff') => {
        const trimmed = username?.trim();
        if (!trimmed) return { ok: false, message: 'Username is required.' };
        if (!password) return { ok: false, message: 'Password is required.' };
        if (password.length < 6) return { ok: false, message: 'Password must be at least 6 characters.' };
        if (!ROLE_OPTIONS.includes(role)) return { ok: false, message: 'Invalid role.' };

        try {
          const data = await apiRegister({ username: trimmed, password, role });
          const created = data?.user;
          const newAcct = {
            id: created?.id,
            username: created?.name || trimmed,
            name: created?.name || trimmed,
            email: created?.email,
            role: created?.role || role,
            active: created?.active ?? true,
          };
          setRegisteredUsers((prev) => [
            ...prev.filter((u) => u.username.toLowerCase() !== trimmed.toLowerCase()),
            newAcct,
          ]);
          return { ok: true };
        } catch (apiErr) {
          const message = getApiErrorMessage(apiErr, 'Registration failed.');
          return { ok: false, message };
        }
      },

      /**
       * addUserAccount({ username, email, password, role }) — Admin creates account in MySQL.
       */
      addUserAccount: async ({ username, email, password, role = 'staff' }) => {
        const trimmed = username?.trim();
        if (!trimmed) return { ok: false, message: 'Username is required.' };
        if (!password) return { ok: false, message: 'Password is required.' };
        if (password.length < 6) return { ok: false, message: 'Password must be at least 6 characters.' };
        if (!ROLE_OPTIONS.includes(role)) return { ok: false, message: 'Invalid role.' };

        try {
          const created = await apiCreateUser({
            username: trimmed,
            email: email?.trim() || undefined,
            password,
            role,
            active: true,
          });
          const newAcct = {
            id: created.id,
            username: created.username || created.name || trimmed,
            name: created.name || created.username || trimmed,
            email: created.email,
            role: created.role || role,
            active: created.active ?? true,
          };
          setRegisteredUsers((prev) => [
            ...prev.filter((u) => u.username.toLowerCase() !== trimmed.toLowerCase()),
            newAcct,
          ]);
          return { ok: true, user: newAcct };
        } catch (err) {
          const message = getApiErrorMessage(err, 'Failed to create user in database.');
          return { ok: false, message };
        }
      },

      logout: async () => {
        try {
          await apiLogout();
        } catch (e) {
          // ignore logout network errors
        }
        setUser(null);
      },

      /**
       * renameUser(newName) — updates current user's name in MySQL and local state.
       */
      renameUser: async (username) => {
        const newName = username?.trim();
        if (!newName) return { ok: false, message: 'Username cannot be blank.' };
        if (user && user.username.toLowerCase() === newName.toLowerCase()) {
          return { ok: true };
        }

        // Sync to MySQL if user has an ID
        if (user?.id) {
          try {
            await apiUpdateUser(user.id, { name: newName });
          } catch (err) {
            const message = getApiErrorMessage(err, 'Failed to update username in database.');
            return { ok: false, message };
          }
        }

        const oldName = user?.username;
        setUser((curr) => (curr ? { ...curr, username: newName, name: newName } : curr));
        setRegisteredUsers((prev) =>
          prev.map((u) =>
            oldName && u.username.toLowerCase() === oldName.toLowerCase()
              ? { ...u, username: newName, name: newName }
              : u
          )
        );
        return { ok: true };
      },

      /**
       * updateUserRole(username, newRole) — updates role in MySQL and local state.
       */
      updateUserRole: async (username, newRole) => {
        if (!ROLE_OPTIONS.includes(newRole)) return { ok: false, message: 'Invalid role.' };

        const target = registeredUsers.find(
          (u) => u.username.toLowerCase() === username.toLowerCase()
        );

        // Sync to MySQL if ID exists
        if (target?.id) {
          try {
            await apiUpdateUser(target.id, { role: newRole });
          } catch (err) {
            const message = getApiErrorMessage(err, 'Failed to update role in database.');
            return { ok: false, message };
          }
        }

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
       * toggleUserActive(username, currentUser) — updates status in MySQL and local state.
       */
      toggleUserActive: async (username, currentUser) => {
        if (
          currentUser &&
          currentUser.username.toLowerCase() === username.toLowerCase()
        ) {
          return { ok: false, message: 'You cannot deactivate your own account.' };
        }

        const target = registeredUsers.find(
          (u) => u.username.toLowerCase() === username.toLowerCase()
        );
        const nextActive = target ? !target.active : false;

        // Sync to MySQL if ID exists
        if (target?.id) {
          try {
            await apiUpdateUser(target.id, { active: nextActive });
          } catch (err) {
            const message = getApiErrorMessage(err, 'Failed to update account status in database.');
            return { ok: false, message };
          }
        }

        setRegisteredUsers((prev) =>
          prev.map((u) =>
            u.username.toLowerCase() === username.toLowerCase() ? { ...u, active: nextActive } : u
          )
        );
        return { ok: true };
      },

      /**
       * deleteUser(targetIdentifier, currentUser) — removes user from MySQL and local state.
       */
      deleteUser: async (targetIdentifier, currentUser) => {
        const username = typeof targetIdentifier === 'object'
          ? (targetIdentifier.username || targetIdentifier.name)
          : targetIdentifier;

        const currentUsername = currentUser?.username || currentUser?.name;
        if (
          currentUsername &&
          username &&
          currentUsername.toLowerCase() === username.toLowerCase()
        ) {
          return { ok: false, message: 'You cannot delete your own account.' };
        }

        const target = typeof targetIdentifier === 'object'
          ? targetIdentifier
          : registeredUsers.find(
              (u) => (u.username || u.name || '').toLowerCase() === (username || '').toLowerCase()
            );

        const identifierToDelete = target?.id || target?.username || target?.email || username;

        // 1. Delete from MySQL database
        try {
          await apiDeleteUser(identifierToDelete);
        } catch (err) {
          // If 404 (already gone from database), proceed to clean local state.
          // Otherwise, if database threw an error (e.g. Ais cannot be deleted), abort!
          if (err.response?.status !== 404) {
            const message = getApiErrorMessage(err, 'Failed to delete account from database.');
            return { ok: false, message };
          }
        }

        // 2. Remove from local state
        setRegisteredUsers((prev) =>
          prev.filter((u) => (u.username || u.name || '').toLowerCase() !== (username || '').toLowerCase())
        );

        // 3. Immediately re-sync with MySQL to ensure exact parity
        try {
          const fresh = await apiGetUsers();
          if (Array.isArray(fresh)) {
            setRegisteredUsers(fresh);
          }
        } catch (e) {
          // keep filtered state if fetch fails
        }

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
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isStaff: role === 'staff',
    canManageCatalog: role === 'admin',
    canAddProduct: role === 'admin',
    canEditProduct: role === 'admin' || role === 'manager',
    canDeleteProduct: role === 'admin',
    canViewSuppliers: role === 'admin' || role === 'manager' || role === 'staff',
    canAddSupplier: role === 'admin',
    canEditSupplier: role === 'admin' || role === 'manager',
    canDeleteSupplier: role === 'admin',
    canManageAccounts: role === 'admin',
    canAddAccount: role === 'admin',
    canManageReorderRules: role === 'admin',
    canAddTransaction: role === 'admin' || role === 'manager',
    canEditTransaction: role === 'admin' || role === 'manager',
    canDeleteTransaction: role === 'admin',
    canChangeTransactionStatus: role === 'admin' || role === 'manager' || role === 'staff',
  };
}
