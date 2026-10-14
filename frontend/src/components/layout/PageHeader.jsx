import { useEffect, useRef } from 'react';
import styles from './PageHeader.module.css';
import { SearchIcon, SortIcon } from '../ui/Icons.jsx';

export default function PageHeader({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search by name',
  // Sort By props
  sortLabel = 'Sort By',
  sortActive = false,
  sortOpen = false,
  sortOptions = [],
  onSortToggle,
  onSortSelect,
  sortRef,
  // Legacy single-click handler (no dropdown) — kept for pages that still use it
  onSortClick,
  action,
}) {
  // Close dropdown when clicking outside
  const internalRef = useRef(null);
  const resolvedRef = sortRef || internalRef;

  useEffect(() => {
    if (!sortOpen) return;
    function handleOutside(e) {
      if (resolvedRef.current && !resolvedRef.current.contains(e.target)) {
        onSortToggle && onSortToggle();
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [sortOpen, resolvedRef, onSortToggle]);

  const hasSortDropdown = sortOptions.length > 0 && onSortToggle;

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

        {/* Sort By with dropdown */}
        {hasSortDropdown && (
          <div className={styles.sortWrap} ref={resolvedRef}>
            <button
              type="button"
              className={`${styles.iconButton} ${sortActive ? styles.iconButtonActive : ''}`}
              onClick={onSortToggle}
            >
              <SortIcon width={16} height={16} />
              {sortLabel}
            </button>
            {sortOpen && (
              <ul className={styles.sortDropdown}>
                {sortOptions.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className={`${styles.sortOption} ${sortLabel === opt.label ? styles.sortOptionActive : ''}`}
                      onClick={() => onSortSelect(opt.value)}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
                {sortActive && (
                  <li className={styles.sortClearRow}>
                    <button
                      type="button"
                      className={styles.sortClear}
                      onClick={() => onSortSelect('')}
                    >
                      Clear sort
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* Legacy single-click Sort By (no dropdown) */}
        {!hasSortDropdown && onSortClick && (
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
