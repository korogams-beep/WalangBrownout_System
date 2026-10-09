import { Navigate } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../../context/AuthContext.jsx';

/**
 * Gate a write-action route (a create/edit form, not a view page) to
 * specific roles, e.g.:
 *   <RequireRole allow={['admin']}><ProductForm /></RequireRole>
 * - Not logged in         -> back to the login screen.
 * - Logged in, wrong role -> sent to that role's own home page.
 */
export default function RequireRole({ allow, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  if (!allow.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />;

  return children;
}
