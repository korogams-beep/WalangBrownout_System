import { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import Button from '../components/ui/Button.jsx';
import TransactionDrawer from '../components/layout/TransactionDrawer.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { usePermissions } from '../context/AuthContext.jsx';
import { TRANSACTION_TYPES, getNextStatus } from '../utils/inventoryLogic.js';
import styles from './Transactions.module.css';

const TYPE_FILTERS = ['All', ...TRANSACTION_TYPES];

const SORT_OPTIONS = [
  { label: 'Product Name (A–Z)',      value: 'name' },
  { label: 'Transaction Date (Newest)', value: 'date_desc' },
  { label: 'Transaction Date (Oldest)', value: 'date_asc' },
  { label: 'Quantity (High–Low)',      value: 'qty_desc' },
  { label: 'Quantity (Low–High)',      value: 'qty_asc' },
];

export default function Transactions() {
  const { transactions, products, advanceTransaction } = useInventory();
  const { canAddTransaction, canChangeTransactionStatus } = usePermissions();
  const [query, setQuery]       = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortBy, setSortBy]     = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  const rows = useMemo(() => {
    return transactions.map((t) => ({
      ...t,
      productName: products.find((p) => p.id === t.productId)?.name || t.productId,
    }));
  }, [transactions, products]);

  const filtered = useMemo(() => {
    let result = rows
      .filter((t) => typeFilter === 'All' || t.type === typeFilter)
      .filter((t) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return t.productName.toLowerCase().includes(q);
      });

    if (sortBy === 'name')      result = [...result].sort((a, b) => a.productName.localeCompare(b.productName));
    if (sortBy === 'date_desc') result = [...result].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    if (sortBy === 'date_asc')  result = [...result].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    if (sortBy === 'qty_desc')  result = [...result].sort((a, b) => b.qty - a.qty);
    if (sortBy === 'qty_asc')   result = [...result].sort((a, b) => a.qty - b.qty);

    return result;
  }, [rows, query, typeFilter, sortBy]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort By';

  return (
    <div>
      <PageHeader
        title="Transactions"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name"
        sortLabel={currentSortLabel}
        sortActive={!!sortBy}
        sortOpen={sortOpen}
        sortOptions={SORT_OPTIONS}
        onSortToggle={() => setSortOpen((prev) => !prev)}
        onSortSelect={(val) => { setSortBy(val); setSortOpen(false); }}
        sortRef={sortRef}
      />

      <div className={styles.filterRow}>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.filterChip} ${t === typeFilter ? styles.filterChipActive : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <DataTable
          rowKey="id"
          rows={filtered}
          emptyMessage="No transactions for this filter yet."
          columns={[
            { key: 'id', header: 'Transaction ID' },
            { key: 'dateTime', header: 'Transaction Date', render: (r) => new Date(r.dateTime).toLocaleString() },
            { key: 'type', header: 'Type', render: (r) => <StatusBadge status={r.type} /> },
            { key: 'productName', header: 'Product Name' },
            { key: 'qty', header: 'Quantity', align: 'right' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (r) => {
                const next = getNextStatus(r.type, r.status);
                if (!next) return null;
                if (!canChangeTransactionStatus) return null;
                return (
                  <Button variant="secondary" onClick={() => advanceTransaction(r.id)}>
                    Mark as {next}
                  </Button>
                );
              },
            },
          ]}
        />
      </Card>

      {canAddTransaction && (
        <div className={styles.actions}>
          <Button variant="accent" onClick={() => setDrawerOpen(true)}>
            New Transaction
          </Button>
        </div>
      )}

      {canAddTransaction && <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
