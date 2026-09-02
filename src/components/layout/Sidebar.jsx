import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { useAuth, ROLE_LABEL } from '../../context/AuthContext.jsx';
import {
  DashboardIcon,
  ProductIcon,
  TransactionIcon,
  ReportIcon,
  SettingsIcon,
  LogoutIcon,
  BoltIcon,
} from '../ui/Icons.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/transactions', label: 'Transactions', icon: TransactionIcon },
  { to: '/products', label: 'Products', icon: ProductIcon },
  { to: '/analysis', label: 'Analysis', icon: ReportIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/');
  }

  const initial = (user?.username || 'G').trim().charAt(0).toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <BoltIcon width={18} height={18} />
        </span>
        <div className={styles.brandText}>
          <p className={styles.brandName}>WalangBrownout</p>
          <p className={styles.brandSub}>Inventory Management</p>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <Icon width={18} height={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.userChip}>
        <span className={styles.avatar}>{initial}</span>
        <div className={styles.userText}>
          <p className={styles.userName}>{user?.username || 'Guest'}</p>
          <p className={styles.userRole}>{user ? ROLE_LABEL[user.role] : 'Not signed in'}</p>
        </div>
      </div>

      <button type="button" className={styles.logout} onClick={handleLogout}>
        <LogoutIcon width={18} height={18} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
