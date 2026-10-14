import { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import Button from '../components/ui/Button.jsx';
import TransactionDrawer from '../components/layout/TransactionDrawer.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { usePermissions } from '../context/AuthContext.jsx';
import { TRANSACTION_TYPES, TRANSACTION_STATUS_FLOW, getNextStatus } from '../utils/inventoryLogic.js';
import { EditIcon, TrashIcon } from '../components/ui/Icons.jsx';
import styles from './Transactions.module.css';

const TYPE_FILTERS = ['All', ...TRANSACTION_TYPES];

const SORT_OPTIONS = [
  { label: 'Product Name (A–Z)',        value: 'name' },
  { label: 'Transaction Date (Newest)', value: 'date_desc' },
  { label: 'Transaction Date (Oldest)', value: 'date_asc' },
  { label: 'Quantity (High–Low)',        value: 'qty_desc' },
  { label: 'Quantity (Low–High)',        value: 'qty_asc' },
];

export default function Transactions() {
  const { transactions, products, advanceTransaction, editTransaction, deleteTransaction } = useInventory();
  const { canAddTransaction, canChangeTransactionStatus, canEditTransaction, canDeleteTransaction } = usePermissions();
  const [query, setQuery]           = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortBy, setSortBy]         = useState('');
  const [sortOpen, setSortOpen]     = useState(false);
  const sortRef = useRef(null);

  // Edit modal state
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState({ qty: '', status: '' });

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(() => {
    return transactions.map((t) => ({
      ...t,
      productName: products.find((p) => p.id === t.productId)?.name || t.productName || t.productId,
    }));
  }, [transactions, products]);

  const filtered = useMemo(() => {
    let result = rows
      .filter((t) => typeFilter === 'All' || t.type === typeFilter)
      .filter((t) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (t.productName || '').toLowerCase().includes(q) || (t.id || '').toLowerCase().includes(q);
      });

    if (sortBy === 'name')      result = [...result].sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
    if (sortBy === 'date_desc') result = [...result].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    if (sortBy === 'date_asc')  result = [...result].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    if (sortBy === 'qty_desc')  result = [...result].sort((a, b) => b.qty - a.qty);
    if (sortBy === 'qty_asc')   result = [...result].sort((a, b) => a.qty - b.qty);

    return result;
  }, [rows, query, typeFilter, sortBy]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort By';

  function handleOpenEdit(txn) {
    setEditTarget(txn);
    setEditForm({
      qty: txn.qty || 1,
      status: txn.status || 'Open',
    });
  }

  function handleSaveEdit(e) {
    e.preventDefault();
    if (editTarget) {
      editTransaction({
        ...editTarget,
        qty: Number(editForm.qty) || 1,
        status: editForm.status,
      });
      setEditTarget(null);
    }
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name or ID"
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
              header: 'Actions',
              align: 'right',
              render: (r) => {
                const next = getNextStatus(r.type, r.status);
                return (
                  <span className={styles.rowActions}>
                    {next && canChangeTransactionStatus && (
                      <Button variant="secondary" onClick={() => advanceTransaction(r.id)}>
                        Mark as {next}
                      </Button>
                    )}
                    {canEditTransaction && (
                      <button
                        type="button"
                        className={styles.actionBtn}
                        title="Edit transaction"
                        onClick={() => handleOpenEdit(r)}
                      >
                        <EditIcon width={14} height={14} />
                        Edit
                      </button>
                    )}
                    {canDeleteTransaction && (
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                        title="Delete transaction"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <TrashIcon width={14} height={14} />
                        Delete
                      </button>
                    )}
                  </span>
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

      {/* Edit Transaction Modal */}
      {editTarget && (
        <div className={styles.modalOverlay} onClick={() => setEditTarget(null)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Edit Transaction ({editTarget.id})</h3>
            <form onSubmit={handleSaveEdit}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Product</label>
                <input
                  className={styles.formInput}
                  type="text"
                  value={editTarget.productName}
                  disabled
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Type</label>
                <input
                  className={styles.formInput}
                  type="text"
                  value={editTarget.type}
                  disabled
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Quantity</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="1"
                  value={editForm.qty}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, qty: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Status</label>
                <select
                  className={styles.formSelect}
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {(TRANSACTION_STATUS_FLOW[editTarget.type] || ['Open', 'Completed']).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className={styles.modalFooter}>
                <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="accent">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Delete Transaction?</h3>
            <p className={styles.modalBody}>
              Are you sure you want to permanently delete transaction <strong>{deleteTarget.id}</strong> ({deleteTarget.productName} - {deleteTarget.type} of {deleteTarget.qty} units)?
              This change will be removed from MySQL.
            </p>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
