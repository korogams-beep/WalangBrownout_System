import { useNavigate } from 'react-router-dom';
import styles from './FormPanel.module.css';

export default function FormPanel({ title, children, footer, closeTo }) {
  const navigate = useNavigate();

  return (
    <div className={styles.panel}>
      <div className={styles.titleBar}>
        <h2 className={styles.title}>{title}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label="Close"
          onClick={() => navigate(closeTo || -1)}
        >
          &times;
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
