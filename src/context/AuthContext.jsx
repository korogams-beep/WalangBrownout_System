import { createContext, useContext, useMemo, useState } from 'react';

// Frontend-only session + role state. Real authentication against
// Laravel/Sanctum is Module 2 (backend) scope; this just tracks who's
// "logged in" and which role they picked on the Login screen, for the rest
// of the UI to gate screens/actions by:
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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const actions = useMemo(
    () => ({
      login: (username, role) =>
        setUser({
          username: username?.trim() || ROLE_LABEL[role] || 'Admin',
          role: ROLE_OPTIONS.includes(role) ? role : 'admin',
          loginTime: new Date().toISOString(),
        }),
      logout: () => setUser(null),
      renameUser: (username) =>
        setUser((prev) => (prev ? { ...prev, username: username?.trim() || prev.username } : prev)),
    }),
    []
  );

  const value = useMemo(() => ({ user, ...actions }), [user, actions]);

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
