import { useEffect, useMemo, useState } from 'react';
import styles from './ProductModal.module.css';
import FormPanel from './FormPanel.jsx';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { useInventory } from '../../context/InventoryContext.jsx';
import { classifyProduct, isSeasonal, isPerishable } from '../../utils/inventoryLogic.js';
import formStyles from '../../pages/ProductForm.module.css';

// Same fields/logic as the full-page ProductForm (still reachable at
// /products/new) but shown as a centered pop-up over the Products page with
// a blurred backdrop, instead of navigating away — this is the "Add New
// Product" action Admin is limited to.
const CATEGORIES = ['Group A (AC)', 'Group B (Purifier)', 'Group C (Filter)'];

const initialForm = {
  name: '',
  category: '',
  unitPrice: '',
  startingQty: 0,
  warehouse: 'Main Warehouse',
};

export default function ProductModal({ open, onClose }) {
  const { products, addProduct } = useInventory();
  const nextProductId = useMemo(() => `PID-${String(products.length + 1).padStart(3, '0')}`, [products.length]);

  const [form, setForm] = useState(initialForm);
  const [justAdded, setJustAdded] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const preview = { name: form.name || '(product name)', category: form.category };
  const productClass = classifyProduct(preview);
  const seasonal = isSeasonal(preview);
  const perishable = isPerishable(preview);

  useEffect(() => {
    if (perishable && form.warehouse === 'Main Warehouse') {
      update('warehouse', 'Cold Storage');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perishable]);

  function handleSubmit(e) {
    e.preventDefault();
    const product = {
      id: nextProductId,
      name: form.name,
      category: form.category,
      unitPrice: Number(form.unitPrice) || 0,
      qtyOnHand: Number(form.startingQty) || 0,
      warehouse: form.warehouse,
      shelfLifeMonths: perishable ? 9 : null,
    };
    addProduct(product);
    setJustAdded(product);
  }

  function handleClose() {
    setForm(initialForm);
    setJustAdded(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modalWrap} onClick={(e) => e.stopPropagation()}>
        {justAdded ? (
          <FormPanel
            title="PRODUCT ADDED"
            onClose={handleClose}
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setJustAdded(null);
                    setForm(initialForm);
                  }}
                >
                  Add Another
                </Button>
                <Button variant="accent" onClick={handleClose}>
                  Done
                </Button>
              </>
            }
          >
            <div className={formStyles.confirmBody}>
              <p className={formStyles.confirmLead}>
                <strong>{justAdded.name}</strong> ({justAdded.id}) was added to inventory.
              </p>
              <div className={formStyles.confirmGrid}>
                <div>
                  <span className={formStyles.confirmLabel}>Category</span>
                  <span>{justAdded.category}</span>
                </div>
                <div>
                  <span className={formStyles.confirmLabel}>Warehouse</span>
                  <span>{justAdded.warehouse}</span>
                </div>
                <div>
                  <span className={formStyles.confirmLabel}>Starting Qty</span>
                  <span>{justAdded.qtyOnHand}</span>
                </div>
                <div>
                  <span className={formStyles.confirmLabel}>Class</span>
                  <StatusBadge status={productClass} />
                </div>
                <div>
                  <span className={formStyles.confirmLabel}>Seasonal</span>
                  <StatusBadge status={seasonal ? 'Yes' : 'No'} />
                </div>
                <div>
                  <span className={formStyles.confirmLabel}>Perishable</span>
                  <StatusBadge status={perishable ? 'Yes' : 'No'} />
                </div>
              </div>
              <p className={formStyles.confirmNote}>
                A reorder rule was generated automatically for this product — see Settings.
              </p>
            </div>
          </FormPanel>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormPanel
              title="ADD NEW PRODUCT"
              onClose={handleClose}
              footer={
                <>
                  <Button type="button" variant="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent">
                    Save Product
                  </Button>
                </>
              }
            >
              <FormField label="Product ID (auto-generated)">
                <input value={nextProductId} disabled />
              </FormField>
              <FormField label="Product Name">
                <input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Smart Thermostat"
                  required
                />
              </FormField>

              <FormField label="Category">
                <select value={form.category} onChange={(e) => update('category', e.target.value)} required>
                  <option value="" disabled>
                    Select category
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Unit Price">
                <input
                  type="number"
                  min="0"
                  value={form.unitPrice}
                  onChange={(e) => update('unitPrice', e.target.value)}
                  placeholder="₱"
                  required
                />
              </FormField>

              <FormField label="Starting Quantity">
                <input
                  type="number"
                  min="0"
                  value={form.startingQty}
                  onChange={(e) => update('startingQty', e.target.value)}
                />
              </FormField>
              <FormField label="Warehouse">
                <select value={form.warehouse} onChange={(e) => update('warehouse', e.target.value)}>
                  <option>Main Warehouse</option>
                  <option>Cold Storage</option>
                </select>
              </FormField>

              <div className={formStyles.previewSpan}>
                <p className={formStyles.previewLabel}>Auto-Classification Preview</p>
                <div className={formStyles.previewRow}>
                  <span className={formStyles.previewItem}>
                    Class <StatusBadge status={productClass} />
                  </span>
                  <span className={formStyles.previewItem}>
                    Seasonal <StatusBadge status={seasonal ? 'Yes' : 'No'} />
                  </span>
                  <span className={formStyles.previewItem}>
                    Perishable <StatusBadge status={perishable ? 'Yes' : 'No'} />
                    {perishable && <span className={formStyles.previewHint}>(9-month shelf life, FIFO tracked)</span>}
                  </span>
                </div>
                <p className={formStyles.previewFooter}>
                  A reorder rule will be generated automatically for this product on save.
                </p>
              </div>
            </FormPanel>
          </form>
        )}
      </div>
    </div>
  );
}
