import styles from './AsyncState.module.css';

export default function AsyncState({ loading, error, loadingText = 'Loading...' }) {
  if (loading) return <p className={styles.loading}>{loadingText}</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  return null;
}
