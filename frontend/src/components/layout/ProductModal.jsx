import { useEffect, useMemo, useState } from 'react';
import styles from './ProductModal.module.css';
import FormPanel from './FormPanel.jsx';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { useInventory } from '../../context/InventoryContext.jsx';
import { classifyProduct, isSeasonal, isPerishable } from '../../utils/inventoryLogic.js';
import formStyles from '../../pages/ProductForm.module.css';

// Handles both ADD and EDIT modes:
//   - Pass no `editProduct` prop → Add mode (original behaviour)
//   - Pass an `editProduct` object → Edit mode (pre-fills form, calls editProduct action)
const CATEGORIES = ['Group A (AC)', 'Group B (Purifier)', 'Group C (Filter)'];

const initialForm = {
  name: '',
  category: '',
  unitPrice: '',
  startingQty: 0,
  warehouse: 'Main Warehouse',
};

export default function ProductModal({ open, onClose, editProduct = null }) {
  const { products, addProduct, editProduct: saveEdit } = useInventory();
  const isEditMode = editProduct !== null;

  const nextProductId = useMemo(
    () => `PID-${String(products.length + 1).padStart(3, '0')}`,
    [products.length]
  );

  const [form, setForm] = useState(initialForm);
  const [justSaved, setJustSaved] = useState(null);

  // Pre-fill form when opening in edit mode
  useEffect(() => {
    if (open) {
      if (isEditMode) {
        setForm({
          name: editProduct.name || '',
          category: editProduct.category || '',
          unitPrice: editProduct.unitPrice ?? '',
          startingQty: editProduct.qtyOnHand ?? 0,
          warehouse: editProduct.warehouse || 'Main Warehouse',
        });
      } else {
        setForm(initialForm);
      }
      setJustSaved(null);
    }
  }, [open, isEditMode, editProduct]);

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
    if (isEditMode) {
      const updated = {
        ...editProduct,
        name: form.name,
        category: form.category,
        unitPrice: Number(form.unitPrice) || 0,
        qtyOnHand: Number(form.startingQty) || 0,
        warehouse: form.warehouse,
        shelfLifeMonths: perishable ? (editProduct.shelfLifeMonths || 9) : null,
      };
      saveEdit(updated);
      setJustSaved(updated);
    } else {
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
      setJustSaved(product);
    }
  }

  function handleClose() {
    setForm(initialForm);
    setJustSaved(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modalWrap} onClick={(e) => e.stopPropagation()}>
        {justSaved ? (
          <FormPanel
            title={isEditMode ? 'PRODUCT UPDATED' : 'PRODUCT ADDED'}
            onClose={handleClose}
            footer={
              <>
                {!isEditMode && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setJustSaved(null);
                      setForm(initialForm);
                    }}
                  >
                    Add Another
                  </Button>
                )}
                <Button variant="accent" onClick={handleClose}>
                  Done
                </Button>
              </>
            }
          >
            <div className={formStyles.confirmBody}>
              <p className={formStyles.confirmLead}>
                <strong>{justSaved.name}</strong> ({justSaved.id}){' '}
                {isEditMode ? 'was updated.' : 'was added to inventory.'}
              </p>
              <div className={formStyles.confirmGrid}>
                <div>
                  <span className={formStyles.confirmLabel}>Category</span>
                  <span>{justSaved.category}</span>
                </div>
                <div>
                  <span className={formStyles.confirmLabel}>Warehouse</span>
                  <span>{justSaved.warehouse}</span>
                </div>
                <div>
                  <span className={formStyles.confirmLabel}>Qty on Hand</span>
                  <span>{justSaved.qtyOnHand}</span>
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
              {!isEditMode && (
                <p className={formStyles.confirmNote}>
                  A reorder rule was generated automatically for this product — see Settings.
                </p>
              )}
            </div>
          </FormPanel>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormPanel
              title={isEditMode ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}
              onClose={handleClose}
              footer={
                <>
                  <Button type="button" variant="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent">
                    {isEditMode ? 'Save Changes' : 'Save Product'}
                  </Button>
                </>
              }
            >
              <FormField label="Product ID">
                <input value={isEditMode ? editProduct.id : nextProductId} disabled />
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

              <FormField label={isEditMode ? 'Quantity on Hand' : 'Starting Quantity'}>
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
                {!isEditMode && (
                  <p className={formStyles.previewFooter}>
                    A reorder rule will be generated automatically for this product on save.
                  </p>
                )}
              </div>
            </FormPanel>
          </form>
        )}
      </div>
    </div>
  );
}
