import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { BoltIcon, EyeIcon, EyeOffIcon } from '../components/ui/Icons.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password visibility state
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

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
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
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
    setShowLoginPassword(false);
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
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
            <div className={styles.passwordField}>
              <input
                className={styles.passwordInput}
                type={showLoginPassword ? 'text' : 'password'}
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.togglePasswordBtn}
                onClick={() => setShowLoginPassword((prev) => !prev)}
                title={showLoginPassword ? 'Hide password' : 'Show password'}
                aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
              >
                {showLoginPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
              </button>
            </div>
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
            <div className={styles.passwordField}>
              <input
                className={styles.passwordInput}
                type={showRegPassword ? 'text' : 'password'}
                placeholder="Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.togglePasswordBtn}
                onClick={() => setShowRegPassword((prev) => !prev)}
                title={showRegPassword ? 'Hide password' : 'Show password'}
                aria-label={showRegPassword ? 'Hide password' : 'Show password'}
              >
                {showRegPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
              </button>
            </div>
            <div className={styles.passwordField}>
              <input
                className={styles.passwordInput}
                type={showRegConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.togglePasswordBtn}
                onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showRegConfirmPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
              </button>
            </div>

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
