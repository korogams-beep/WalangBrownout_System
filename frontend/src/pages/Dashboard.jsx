import { useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { calculateATP, daysUntilExpiry, buildInventoryStatusRows } from '../utils/inventoryLogic.js';
import styles from './Dashboard.module.css';

// Layout + columns match the "UI Dashboard" sheet exactly: a main table
// (Product Name / ATP / Seasonal / Current ROP / Days to Expiry / Fulfillment
// Status) beside an "Inventory Monitoring Summary" panel (Total SKUs / Total
// Inventory Value / Low Stock Alerts / Expiring Batches (<30 days)).
export default function Dashboard() {
  const { products, inventory, reorderRules, batches } = useInventory();

  // Same row-builder used by the Analysis page's Stock Alerts panel, so the
  // two pages never disagree on ATP / live ROP / fulfillment status.
  const rows = useMemo(
    () => buildInventoryStatusRows(products, inventory, reorderRules, batches),
    [products, inventory, reorderRules, batches]
  );

  const totalSkus = products.length;
  const totalInventoryValue = products.reduce((sum, p) => {
    const qty = inventory[p.id]?.qtyOnHand ?? 0;
    return sum + qty * p.unitPrice;
  }, 0);
  const lowStockAlerts = rows.filter((row) => row.status !== 'OK').length;
  const expiringBatches30d = batches.filter(
    (b) => b.quantityRemains > 0 && daysUntilExpiry(b.expiryDate) <= 30
  ).length;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of WalangBrownout Inventory" onSortClick={() => {}} />

      <div className={styles.grid}>
        <Card title="Inventory Control Dashboard">
          <DataTable
            rowKey="productId"
            rows={rows}
            columns={[
              { key: 'name', header: 'Product Name' },
              {
                key: 'atp',
                header: 'Available to Promise (ATP)',
                align: 'right',
                // ATP prevents phantom stock sales: e-commerce should always
                // check this figure, never raw qtyOnHand (case study Section II-B).
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
