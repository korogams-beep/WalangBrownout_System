import { useNavigate } from 'react-router-dom';
import styles from './FormPanel.module.css';

export default function FormPanel({ title, children, footer, closeTo, onClose }) {
  const navigate = useNavigate();

  function handleClose() {
    // Modal usage (ProductModal, TransactionDrawer) passes onClose directly;
    // route usage (RecordTransaction, ProductForm as a full page) falls back
    // to navigating away, same as before.
    if (onClose) return onClose();
    navigate(closeTo || -1);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.titleBar}>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.close} aria-label="Close" onClick={handleClose}>
          &times;
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
