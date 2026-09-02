import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Button from '../components/ui/Button.jsx';
import { PlusIcon } from '../components/ui/Icons.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { getSoonestExpiringBatch, getLastUpdated } from '../utils/inventoryLogic.js';
import styles from './ListPage.module.css';

// Columns match the "UI Products" sheet exactly: Last Updated, Product Name,
// Category, Unit Price, Quantity On Hand, Quantity Committed, Warehouse Name,
// Shelf Life, Expiry Date.
export default function Products() {
  const navigate = useNavigate();
  const { products, inventory, batches, transactions } = useInventory();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return products.map((product) => {
      const inv = inventory[product.id] || { qtyOnHand: 0, qtyCommitted: 0 };
      const batch = getSoonestExpiringBatch(batches, product.id);
      return {
        ...product,
        qtyOnHand: inv.qtyOnHand,
        qtyCommitted: inv.qtyCommitted,
        expiryDate: batch ? batch.expiryDate : null,
        lastUpdated: getLastUpdated(transactions, product.id),
      };
    });
  }, [products, inventory, batches, transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div>
      <PageHeader
        title="Product"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name or id"
        onSortClick={() => {}}
      />

      <Card>
        <DataTable
          rowKey="id"
          rows={filtered}
          columns={[
            {
              key: 'lastUpdated',
              header: 'Last Updated',
              render: (r) => (r.lastUpdated ? new Date(r.lastUpdated).toLocaleString() : '—'),
            },
            { key: 'name', header: 'Product Name' },
            { key: 'category', header: 'Category' },
            { key: 'unitPrice', header: 'Unit Price', align: 'right', render: (r) => `₱${r.unitPrice}` },
            { key: 'qtyOnHand', header: 'Quantity On Hand', align: 'right' },
            { key: 'qtyCommitted', header: 'Quantity Committed', align: 'right' },
            { key: 'warehouse', header: 'Warehouse Name' },
            {
              key: 'shelfLifeMonths',
              header: 'Shelf Life',
              align: 'right',
              render: (r) => (r.shelfLifeMonths ? `${r.shelfLifeMonths} months` : '—'),
            },
            {
              key: 'expiryDate',
              header: 'Expiry Date',
              render: (r) => (r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '—'),
            },
          ]}
        />
      </Card>

      <div className={styles.footerAction}>
        <Button variant="accent" icon={PlusIcon} onClick={() => navigate('/products/new')}>
          Add New Product
        </Button>
      </div>
    </div>
  );
}
