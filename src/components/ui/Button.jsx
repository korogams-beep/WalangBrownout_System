import styles from './Button.module.css';

export default function Button({ variant = 'primary', icon: Icon, children, className = '', ...rest }) {
  return (
    <button className={`${styles.btn} ${styles[variant]} ${className}`} {...rest}>
      {Icon && <Icon width={16} height={16} />}
      {children}
    </button>
  );
}
