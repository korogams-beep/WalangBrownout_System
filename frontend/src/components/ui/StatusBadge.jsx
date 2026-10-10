import styles from './StatusBadge.module.css';

const STATUS_TONE = {
  'OK': 'green',
  'In Stock': 'green',
  'Low Stock': 'yellow',
  'Reorder Alert': 'yellow',
  'Below RoP': 'yellow',
  'Out of Stock': 'red',
  'Class A': 'blue',
  'Class B': 'green',
  'Class C': 'yellow',
  // Transaction types (direction)
  'Orders': 'blue',
  'Sale': 'green',
  'Returns': 'red',
  // Pipeline statuses — shared across both flows
  'Open': 'blue',
  'Ordered': 'blue',
  'Received': 'green',
  'Picked': 'yellow',
  'Shipped': 'yellow',
  'Completed': 'green',
  'Yes': 'yellow',
  'No': 'green',
  'Logged In': 'green',
  'Active': 'green',
  'Inactive': 'red',
};

export default function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] || 'blue';
  return <span className={`${styles.badge} ${styles[tone]}`}>{status}</span>;
}
