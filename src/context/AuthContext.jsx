import { createContext, useContext, useMemo, useState } from 'react';

// Frontend-only session state — who's logged in, for the Settings page.
// Real authentication against Laravel/Sanctum is Module 2 (backend) scope;
// this just tracks a display name + login time in memory for the UI.
const AuthContext = createContext(null);

const DEFAULT_ROLE = 'Inventory Manager';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const actions = useMemo(
    () => ({
      login: (username) =>
        setUser({
          username: username?.trim() || 'Admin',
          role: DEFAULT_ROLE,
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
