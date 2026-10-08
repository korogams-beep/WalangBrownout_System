import { useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Button from '../components/ui/Button.jsx';
import ProductModal from '../components/layout/ProductModal.jsx';
import { PlusIcon, EditIcon, TrashIcon } from '../components/ui/Icons.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { usePermissions } from '../context/AuthContext.jsx';
import { getSoonestExpiringBatch, getLastUpdated } from '../utils/inventoryLogic.js';
import styles from './ListPage.module.css';
import productStyles from './Products.module.css';

export default function Products() {
  const { products, inventory, batches, transactions, deleteProduct } = useInventory();
  const { canAddProduct, canEditProduct, canDeleteProduct } = usePermissions();
  const [query, setQuery] = useState('');

  // Modal state — null = closed, 'add' = add mode, product object = edit mode
  const [modalState, setModalState] = useState(null);

  // Confirm-delete state — holds the product pending confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  const editTarget = modalState && modalState !== 'add' ? modalState : null;

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
            // Actions column — shown when the role can edit or delete (or both)
            ...(canEditProduct || canDeleteProduct
              ? [
                  {
                    key: '_actions',
                    header: 'Actions',
                    align: 'right',
                    render: (r) => (
                      <span className={productStyles.rowActions}>
                        {canEditProduct && (
                          <button
                            type="button"
                            className={productStyles.actionBtn}
                            title="Edit product"
                            onClick={() => setModalState(r)}
                          >
                            <EditIcon width={15} height={15} />
                            Edit
                          </button>
                        )}
                        {canDeleteProduct && (
                          <button
                            type="button"
                            className={`${productStyles.actionBtn} ${productStyles.actionBtnDelete}`}
                            title="Delete product"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <TrashIcon width={15} height={15} />
                            Delete
                          </button>
                        )}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      {/* Add Product button — visible to Admin only */}
      {canAddProduct && (
        <div className={styles.footerAction}>
          <Button
            variant="accent"
            icon={PlusIcon}
            onClick={() => setModalState('add')}
          >
            Add New Product
          </Button>
        </div>
      )}

      {/* Add / Edit modal */}
      <ProductModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        editProduct={editTarget}
      />

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className={productStyles.deleteOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={productStyles.deleteDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={productStyles.deleteTitle}>Delete Product?</h3>
            <p className={productStyles.deleteBody}>
              <strong>{deleteTarget.name}</strong> ({deleteTarget.id}) will be permanently removed
              from the catalog, along with its batches and reorder rule. This cannot be undone.
            </p>
            <div className={productStyles.deleteFooter}>
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
