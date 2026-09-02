import styles from './PageHeader.module.css';
import { SearchIcon, SortIcon } from '../ui/Icons.jsx';

export default function PageHeader({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  onSortClick,
  action,
}) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.controls}>
        {onSearchChange && (
          <label className={styles.searchBox}>
            <SearchIcon width={15} height={15} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </label>
        )}
        {onSortClick && (
          <button type="button" className={styles.iconButton} onClick={onSortClick}>
            <SortIcon width={16} height={16} />
            Sort By
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
