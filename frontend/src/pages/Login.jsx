import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { BoltIcon } from '../components/ui/Icons.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sign-in fields — isolated state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign-up fields — isolated state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  function handleLogin(e) {
    e.preventDefault();
    setError('');
    const result = login(loginUsername, loginPassword);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(ROLE_HOME[result.role] ?? '/dashboard');
  }

  function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const result = register(regUsername, regPassword, 'staff');
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccessMsg(`Account "${regUsername}" created! You can now sign in.`);
    // Clear sign-up fields and switch to sign-in
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
    setMode('login');
  }

  function switchMode(m) {
    setMode(m);
    setError('');
    setSuccessMsg('');
    // Clear both forms when switching so nothing bleeds across
    setLoginUsername('');
    setLoginPassword('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <BoltIcon width={26} height={26} />
        </div>
        <h1 className={styles.title}>WalangBrownout Inventory System</h1>
        <p className={styles.subtitle}>Your distributor of home's comfort goods</p>

        {/* Mode toggle */}
        <div className={styles.modeTabs}>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === 'login' ? styles.modeTabActive : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === 'register' ? styles.modeTabActive : ''}`}
            onClick={() => switchMode('register')}
          >
            Sign Up
          </button>
        </div>

        {successMsg && <p className={styles.successMsg}>{successMsg}</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}

        {mode === 'login' ? (
          <form className={styles.form} onSubmit={handleLogin}>
            <input
              className={styles.input}
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
              autoComplete="username"
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" variant="accent" className={styles.submit}>
              Sign In
            </Button>
            <p className={styles.switchHint}>
              Don't have an account?{' '}
              <button type="button" className={styles.switchLink} onClick={() => switchMode('register')}>
                Sign Up
              </button>
            </p>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleRegister}>
            <input
              className={styles.input}
              type="text"
              placeholder="Username"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              required
              autoComplete="off"
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Confirm Password"
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Button type="submit" variant="accent" className={styles.submit}>
              Create Account
            </Button>
            <p className={styles.switchHint}>
              Already have an account?{' '}
              <button type="button" className={styles.switchLink} onClick={() => switchMode('login')}>
                Sign In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
