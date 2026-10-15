import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPanel from '../components/layout/FormPanel.jsx';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { classifyProduct, isSeasonal, isPerishable } from '../utils/inventoryLogic.js';
import styles from './ProductForm.module.css';

const CATEGORIES = ['Group A (AC)', 'Group B (Purifier)', 'Group C (Filter)'];

export default function ProductForm() {
  const navigate = useNavigate();
  const { products, addProduct } = useInventory();

  // Auto-generate the next Product ID based on highest existing ID
  const nextProductId = useMemo(() => {
    let maxNum = products.length;
    products.forEach((p) => {
      const match = p.id?.match(/PID-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `PID-${String(maxNum + 1).padStart(3, '0')}`;
  }, [products]);

  const [productIdInput, setProductIdInput] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: '',
    unitPrice: '',
    startingQty: 0,
    warehouse: 'Main Warehouse',
  });
  const [justAdded, setJustAdded] = useState(null);

  useEffect(() => {
    if (!productIdInput) {
      setProductIdInput(nextProductId);
    }
  }, [nextProductId]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Live classification preview — computed from the case study's ABC rules
  // the moment a name/category is entered, before the product is even saved.
  const preview = { name: form.name || '(product name)', category: form.category };
  const productClass = classifyProduct(preview);
  const seasonal = isSeasonal(preview);
  const perishable = isPerishable(preview);

  // Perishable (Class C) items live in Cold Storage by default — auto-switch
  // the warehouse suggestion the moment that becomes true, unless the user
  // has already picked something other than the default.
  useEffect(() => {
    if (perishable && form.warehouse === 'Main Warehouse') {
      update('warehouse', 'Cold Storage');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perishable]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const finalId = (productIdInput.trim() || nextProductId).toUpperCase();

    if (products.some((p) => p.id?.toUpperCase() === finalId)) {
      setError(`A product with ID "${finalId}" already exists. Please choose a unique ID.`);
      return;
    }

    try {
      const product = {
        id: finalId,
        name: form.name.trim(),
        category: form.category,
        unitPrice: Number(form.unitPrice) || 0,
        qtyOnHand: Number(form.startingQty) || 0,
        warehouse: form.warehouse,
        shelfLifeMonths: perishable ? 9 : null,
      };

      await addProduct(product);
      setJustAdded(product);
    } catch (err) {
      setError(err?.message || 'Failed to save product to database.');
    }
  }

  if (justAdded) {
    return (
      <div className={styles.confirmWrap}>
        <FormPanel
          title="PRODUCT ADDED"
          closeTo="/products"
          footer={
            <>
              <Button variant="secondary" onClick={() => setJustAdded(null)}>
                Add Another
              </Button>
              <Button variant="accent" onClick={() => navigate('/products')}>
                View Products
              </Button>
            </>
          }
        >
          <div className={styles.confirmBody}>
            <p className={styles.confirmLead}>
              <strong>{justAdded.name}</strong> ({justAdded.id}) was added to inventory.
            </p>
            <div className={styles.confirmGrid}>
              <div>
                <span className={styles.confirmLabel}>Category</span>
                <span>{justAdded.category}</span>
              </div>
              <div>
                <span className={styles.confirmLabel}>Warehouse</span>
                <span>{justAdded.warehouse}</span>
              </div>
              <div>
                <span className={styles.confirmLabel}>Starting Qty</span>
                <span>{justAdded.qtyOnHand}</span>
              </div>
              <div>
                <span className={styles.confirmLabel}>Class</span>
                <StatusBadge status={productClass} />
              </div>
              <div>
                <span className={styles.confirmLabel}>Seasonal</span>
                <StatusBadge status={seasonal ? 'Yes' : 'No'} />
              </div>
              <div>
                <span className={styles.confirmLabel}>Perishable</span>
                <StatusBadge status={perishable ? 'Yes' : 'No'} />
              </div>
            </div>
            <p className={styles.confirmNote}>
              A reorder rule was generated automatically for this product — see Settings.
            </p>
          </div>
        </FormPanel>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormPanel
        title="ADD NEW PRODUCT"
        closeTo="/products"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              Save Product
            </Button>
          </>
        }
      >
        {error && <div className={styles.errorMessage}>{error}</div>}
        <FormField label="Product ID (Auto or Custom)">
          <input
            value={productIdInput}
            onChange={(e) => setProductIdInput(e.target.value.toUpperCase())}
            placeholder={nextProductId}
          />
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

        <div className={styles.previewSpan}>
          <p className={styles.previewLabel}>Auto-Classification Preview</p>
          <div className={styles.previewRow}>
            <span className={styles.previewItem}>
              Class <StatusBadge status={productClass} />
            </span>
            <span className={styles.previewItem}>
              Seasonal <StatusBadge status={seasonal ? 'Yes' : 'No'} />
            </span>
            <span className={styles.previewItem}>
              Perishable <StatusBadge status={perishable ? 'Yes' : 'No'} />
              {perishable && <span className={styles.previewHint}>(9-month shelf life, FIFO tracked)</span>}
            </span>
          </div>
          <p className={styles.previewFooter}>
            A reorder rule will be generated automatically for this product on save.
          </p>
        </div>
      </FormPanel>
    </form>
  );
}
