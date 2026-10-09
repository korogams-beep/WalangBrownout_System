import styles from './KPICard.module.css';

export default function KPICard({ icon: Icon, label, value, caption }) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <Icon width={18} height={18} />
      </div>
      <div>
        <p className={styles.value}>{value}</p>
        <p className={styles.label}>{label}</p>
        {caption && <p className={styles.caption}>{caption}</p>}
      </div>
    </div>
  );
}
