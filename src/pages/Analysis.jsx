import { useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { getSeasonalIndexForMonth, daysUntilExpiry, buildInventoryStatusRows } from '../utils/inventoryLogic.js';
import styles from './Analysis.module.css';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALERT_FILTERS = ['All Alerts', 'Low Stock', 'Out of Stock'];

// This page is the case study's "Analysis" deliverable in UI form: it cross-
// checks stock health (formerly the standalone Alerts page) against the
// case study's seasonal demand model, reorder point formulas, and FIFO
// expiry tracking, all sourced live from the shared inventory state.
export default function Analysis() {
  const { products, inventory, batches, reorderRules } = useInventory();
  const currentMonth = new Date().getMonth();
  const [alertFilter, setAlertFilter] = useState(ALERT_FILTERS[0]);

  // Shared with the Dashboard, so both pages always agree on ATP / live ROP /
  // fulfillment status for the same product.
  const statusRows = useMemo(
    () => buildInventoryStatusRows(products, inventory, reorderRules, batches, currentMonth),
    [products, inventory, reorderRules, batches, currentMonth]
  );

  const alertRows = useMemo(() => {
    return statusRows.filter((row) => {
      if (alertFilter === 'Low Stock') return row.status === 'Low Stock' || row.status === 'Reorder Alert';
      if (alertFilter === 'Out of Stock') return row.status === 'Out of Stock';
      return true;
    });
  }, [statusRows, alertFilter]);

  // Columns match the "UI Analysis" sheet: Product Name / SeasonStartMonth /
  // SeasonEndMonth / Avg Daily Usage / Lead Time in Days / Safety Stock /
  // Reorder Point. Reorder Point is the same live figure shown in the Stock
  // Alerts panel above, joined in here by product.
  const analysisRows = reorderRules.map((rule) => ({
    ...rule,
    productName: products.find((p) => p.id === rule.productId)?.name || rule.productId,
    reorderPoint: statusRows.find((r) => r.productId === rule.productId)?.rop ?? rule.rop,
  }));

  const seasonalRows = MONTH_LABELS.map((label, i) => ({
    month: label,
    index: getSeasonalIndexForMonth(i),
    isCurrent: i === currentMonth,
  }));

  // Class C filters, soonest-expiring first — this is what FIFO picking should pull from next.
  const expiringBatches = batches
    .map((b) => ({ ...b, product: products.find((p) => p.id === b.productId), daysLeft: daysUntilExpiry(b.expiryDate) }))
    .filter((b) => b.product?.productClass === 'Class C' && b.quantityRemains > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div>
      <PageHeader title="Analysis" subtitle="Stock alerts, reorder points, and seasonal demand — cross-checked live" />

      <Card title="Stock Alerts">
        <div className={styles.tabs}>
          {ALERT_FILTERS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${tab === alertFilter ? styles.tabActive : ''}`}
              onClick={() => setAlertFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <DataTable
          rowKey="productId"
          rows={alertRows}
          emptyMessage="No alerts in this filter."
          columns={[
            { key: 'productId', header: 'Product ID' },
            { key: 'name', header: 'Product Name' },
            { key: 'qtyOnHand', header: 'Quantity on Hand', align: 'right' },
            { key: 'qtyCommitted', header: 'Quantity Committed', align: 'right' },
            { key: 'atp', header: 'Available to Promise (ATP)', align: 'right' },
            { key: 'rop', header: 'Current ROP', align: 'right' },
            { key: 'status', header: 'Fulfillment Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </Card>

      <Card title="Reorder Point Analysis" className={styles.riskCard}>
        <DataTable
          rowKey="id"
          rows={analysisRows}
          emptyMessage="No reorder rules configured yet."
          columns={[
            { key: 'productName', header: 'Product Name' },
            { key: 'seasonStart', header: 'SeasonStartMonth', render: (r) => r.seasonStart || '—' },
            { key: 'seasonEnd', header: 'SeasonEndMonth', render: (r) => r.seasonEnd || '—' },
            { key: 'avgDailyUsage', header: 'Avg Daily Usage', align: 'right' },
            { key: 'leadTimeDays', header: 'Lead Time in Days', align: 'right' },
            { key: 'safetyStock', header: 'Safety Stock', align: 'right' },
            { key: 'reorderPoint', header: 'Reorder Point', align: 'right' },
          ]}
        />
      </Card>

      <div className={styles.reportGrid}>
        <Card title="Seasonal Index Tracker — Portable AC Units">
          <DataTable
            rowKey="month"
            rows={seasonalRows}
            columns={[
              {
                key: 'month',
                header: 'Month',
                render: (r) => (r.isCurrent ? <strong>{r.month} (current)</strong> : r.month),
              },
              { key: 'index', header: 'Seasonal Index', align: 'right', render: (r) => `${r.index.toFixed(1)}×` },
            ]}
          />
        </Card>

        <Card title="Class C Filters Nearing Expiration">
          <DataTable
            rowKey="batchId"
            rows={expiringBatches}
            emptyMessage="No Class C batches currently tracked."
            columns={[
              { key: 'batchId', header: 'Batch ID' },
              { key: 'productName', header: 'Product', render: (r) => r.product?.name },
              { key: 'expiryDate', header: 'Expiry Date', render: (r) => new Date(r.expiryDate).toLocaleDateString() },
              {
                key: 'daysLeft',
                header: 'Days Remaining',
                align: 'right',
                render: (r) => <span className={r.daysLeft <= 30 ? styles.expiryDanger : undefined}>{r.daysLeft}</span>,
              },
            ]}
          />
        </Card>
      </div>

      <Card title="Product Risk Profile" className={styles.riskCard}>
        <DataTable
          rowKey="id"
          rows={products}
          columns={[
            { key: 'name', header: 'Product' },
            { key: 'productClass', header: 'Class', render: (r) => <StatusBadge status={r.productClass} /> },
            { key: 'seasonal', header: 'Seasonal?', render: (r) => <StatusBadge status={r.seasonal ? 'Yes' : 'No'} /> },
            {
              key: 'perishable',
              header: 'Perishable?',
              render: (r) => <StatusBadge status={r.productClass === 'Class C' ? 'Yes' : 'No'} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
