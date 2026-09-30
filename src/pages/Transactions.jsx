import { useMemo, useState } from 'react';
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

export default function Transactions() {
  const { transactions, products, advanceTransaction } = useInventory(); // shared log — updates the instant any page dispatches an action
  const { canAddTransaction, canChangeTransactionStatus } = usePermissions();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rows = useMemo(() => {
    return transactions.map((t) => ({
      ...t,
      productName: products.find((p) => p.id === t.productId)?.name || t.productId,
    }));
  }, [transactions, products]);

  const filtered = useMemo(() => {
    return rows
      .filter((t) => typeFilter === 'All' || t.type === typeFilter)
      .filter((t) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return t.id.toLowerCase().includes(q) || t.productName.toLowerCase().includes(q);
      });
  }, [rows, query, typeFilter]);

  return (
    <div>
      <PageHeader
        title="Transactions"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search transaction"
        onSortClick={() => {}}
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
            { key: 'dateTime', header: 'TransactionDate', render: (r) => new Date(r.dateTime).toLocaleString() },
            { key: 'type', header: 'Type', render: (r) => <StatusBadge status={r.type} /> },
            { key: 'productName', header: 'Product Name' },
            { key: 'qty', header: 'Quantity', align: 'right' },
            // Pipeline status — Orders go Open -> Ordered -> Received -> Completed;
            // Sale/Returns go Open -> Picked -> Shipped -> Completed.
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            {
              key: 'action',
              header: '',
              align: 'right',
              render: (r) => {
                const next = getNextStatus(r.type, r.status);
                if (!next) return null;
                // Admin, Manager, and Staff can all advance a transaction's
                // status — this is the one action Staff is allowed to do.
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

      {/* Only Admin and Manager can create transactions — hidden entirely for Staff */}
      {canAddTransaction && (
        <div className={styles.actions}>
          <Button
            variant="accent"
            onClick={() => setDrawerOpen(true)}
          >
            New Transaction
          </Button>
        </div>
      )}

      {canAddTransaction && <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
