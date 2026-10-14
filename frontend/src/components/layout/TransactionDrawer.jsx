import { useState } from 'react';
import styles from './TransactionDrawer.module.css';
import FormPanel from './FormPanel.jsx';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import { useInventory } from '../../context/InventoryContext.jsx';
import { TRANSACTION_TYPES } from '../../utils/inventoryLogic.js';

const initialForm = {
  productId: '',
  type: TRANSACTION_TYPES[0],
  quantity: '',
  expiryDate: '',
  location: '',
  supplierId: '',
};

export default function TransactionDrawer({ open, onClose }) {
  const { products, suppliers, createTransaction } = useInventory();
  const [form, setForm] = useState(initialForm);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const selectedProduct = products.find((p) => p.id === form.productId);
  const isPerishableOrder = form.type === 'Orders' && selectedProduct?.productClass === 'Class C';
  const isOrders  = form.type === 'Orders';
  const isReturns = form.type === 'Returns';
  const needsSupplier = isOrders || isReturns;

  function handleSubmit(e) {
    e.preventDefault();
    createTransaction({
      type: form.type,
      productId: form.productId,
      qty: Number(form.quantity) || 0,
      expiryDate: isPerishableOrder && form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
      location: isOrders ? form.location : undefined,
      supplierId: needsSupplier ? form.supplierId : undefined,
    });
    setForm(initialForm);
    onClose();
  }

  function handleCancel() {
    setForm(initialForm);
    onClose();
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modalWrap} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <FormPanel
            title="NEW TRANSACTION"
            onClose={handleCancel}
            footer={
              <>
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="accent">
                  Create Transaction
                </Button>
              </>
            }
          >
            {/* Col 1 */}
            <FormField label="Type">
              <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>

            {/* Col 2 */}
            <FormField label="Product Name">
              <select value={form.productId} onChange={(e) => update('productId', e.target.value)} required>
                <option value="" disabled>Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FormField>

            {/* Col 1 */}
            <FormField label="Quantity">
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => update('quantity', e.target.value)}
                required
              />
            </FormField>

            {/* Col 2 — Supplier shown for Orders and Returns, empty cell otherwise */}
            {needsSupplier && (
              <FormField label="Supplier">
                <select value={form.supplierId} onChange={(e) => update('supplierId', e.target.value)}>
                  <option value="">Select supplier (optional)</option>
                  {(suppliers || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Orders-only fields */}
            {isOrders && (
              <FormField label="Bin Location">
                <input
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="LOC-A1"
                />
              </FormField>
            )}

            {isOrders && selectedProduct && (
              <FormField
                label={
                  isPerishableOrder
                    ? 'Expiry Date (required — Class C)'
                    : 'Expiry Date (n/a for this product)'
                }
              >
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => update('expiryDate', e.target.value)}
                  required={isPerishableOrder}
                  disabled={!isPerishableOrder}
                />
              </FormField>
            )}

            {/* Helper — spans both columns via CSS */}
            <p className={styles.helperText}>
              {isOrders
                ? 'Stock is added once this Order reaches "Received".'
                : isReturns
                ? 'Stock is returned to inventory once this Return reaches "Received".'
                : 'Stock is removed once this transaction reaches "Shipped".'}
            </p>
          </FormPanel>
        </form>
      </div>
    </div>
  );
}
