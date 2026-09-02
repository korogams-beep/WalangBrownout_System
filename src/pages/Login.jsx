import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { BoltIcon } from '../components/ui/Icons.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth, ROLE_HOME, ROLE_LABEL, ROLE_OPTIONS } from '../context/AuthContext.jsx';

const ROLE_HINT = {
  admin: 'Full access to every module.',
  manager: 'Can view everything — on Transactions, can add new transactions and change status.',
  staff: 'Can view everything — on Transactions, can only change status.',
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    // Auth against Laravel/Sanctum is Module 2 scope — this build is frontend-only,
    // so continuing just records who's "logged in" and their role for the rest
    // of the session (see Settings) and takes them into the app shell.
    login(username, role);
    navigate(ROLE_HOME[role]);
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.logo}>
          <BoltIcon width={26} height={26} />
        </div>
        <h1 className={styles.title}>WalangBrownout Inventory System</h1>
        <p className={styles.subtitle}>Your distributor of home's comfort goods</p>

        <div className={styles.roleTabs} role="radiogroup" aria-label="Sign in as">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              className={`${styles.roleTab} ${role === r ? styles.roleTabActive : ''}`}
              onClick={() => setRole(r)}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>

        <input
          className={styles.input}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <p className={styles.roleHint}>{ROLE_HINT[role]}</p>

        <Button type="submit" variant="accent" className={styles.submit}>
          Continue as {ROLE_LABEL[role]}
        </Button>
      </form>
    </div>
  );
}
