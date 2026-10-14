import { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { calculateATP, daysUntilExpiry, buildInventoryStatusRows } from '../utils/inventoryLogic.js';
import styles from './Dashboard.module.css';

const SORT_OPTIONS = [
  { label: 'Product Name (A–Z)',    value: 'name' },
  { label: 'Fulfillment Status',    value: 'status' },
];

// Status sort order: surface critical states first
const STATUS_ORDER = { 'Critical': 0, 'Low': 1, 'Reorder': 2, 'OK': 3 };

export default function Dashboard() {
  const { products, inventory, reorderRules, batches } = useInventory();
  const [sortBy, setSortBy]     = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  const rows = useMemo(
    () => buildInventoryStatusRows(products, inventory, reorderRules, batches),
    [products, inventory, reorderRules, batches]
  );

  const sortedRows = useMemo(() => {
    if (!sortBy) return rows;
    return [...rows].sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'status') {
        const oa = STATUS_ORDER[a.status] ?? 99;
        const ob = STATUS_ORDER[b.status] ?? 99;
        return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [rows, sortBy]);

  const totalSkus = products.length;
  const totalInventoryValue = products.reduce((sum, p) => {
    const qty = inventory[p.id]?.qtyOnHand ?? 0;
    return sum + qty * p.unitPrice;
  }, 0);
  const lowStockAlerts = rows.filter((row) => row.status !== 'OK').length;
  const expiringBatches30d = batches.filter(
    (b) => b.quantityRemains > 0 && daysUntilExpiry(b.expiryDate) <= 30
  ).length;

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort By';

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of WalangBrownout Inventory"
        sortLabel={currentSortLabel}
        sortActive={!!sortBy}
        sortOpen={sortOpen}
        sortOptions={SORT_OPTIONS}
        onSortToggle={() => setSortOpen((prev) => !prev)}
        onSortSelect={(val) => { setSortBy(val); setSortOpen(false); }}
        sortRef={sortRef}
      />

      <div className={styles.grid}>
        <Card title="Inventory Control Dashboard">
          <DataTable
            rowKey="productId"
            rows={sortedRows}
            columns={[
              { key: 'name', header: 'Product Name' },
              {
                key: 'atp',
                header: 'Available to Promise (ATP)',
                align: 'right',
                render: (row) => {
                  const atp = calculateATP(row);
                  return <span className={atp <= 0 ? styles.atpDanger : undefined}>{atp}</span>;
                },
              },
              { key: 'seasonal', header: 'Seasonal', render: (row) => (row.seasonal ? 'Yes' : 'No') },
              { key: 'rop', header: 'Current ROP', align: 'right' },
              {
                key: 'daysToExpiry',
                header: 'Days to Expiry',
                align: 'right',
                render: (row) => (row.daysToExpiry === null ? '—' : row.daysToExpiry),
              },
              {
                key: 'status',
                header: 'Fulfillment Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
          />
        </Card>

        <Card title="Inventory Monitoring Summary" className={styles.summaryCard}>
          <div className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Total SKUs</span>
              <span className={styles.summaryValue}>{totalSkus}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Total Inventory Value</span>
              <span className={styles.summaryValue}>₱{totalInventoryValue.toLocaleString()}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Low Stock Alerts</span>
              <span className={styles.summaryValue}>{lowStockAlerts}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Expiring Batches (&lt;30 days)</span>
              <span className={styles.summaryValue}>{expiringBatches30d}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
