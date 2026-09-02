import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Any logged-in role (admin/manager/staff) can pass — every page in the app
// shell is viewable by all three. This just keeps a signed-out visitor from
// landing on the shell directly via URL.
export default function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return children;
}
