import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPanel from '../components/layout/FormPanel.jsx';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { TRANSACTION_TYPES } from '../utils/inventoryLogic.js';

const initialForm = {
  productId: '',
  type: TRANSACTION_TYPES[0],
  quantity: '',
  expiryDate: '',
  location: '',
};

export default function RecordTransaction() {
  const navigate = useNavigate();
  const { products, createTransaction } = useInventory();
  const [form, setForm] = useState(initialForm);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const selectedProduct = products.find((p) => p.id === form.productId);
  const isPerishableOrder = form.type === 'Orders' && selectedProduct?.productClass === 'Class C';

  function handleSubmit(e) {
    e.preventDefault();
    createTransaction({
      type: form.type,
      productId: form.productId,
      qty: Number(form.quantity) || 0,
      expiryDate: isPerishableOrder && form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
      location: form.type === 'Orders' ? form.location : undefined,
    });
    navigate('/transactions');
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormPanel
        title="TRANSACTIONS — NEW TRANSACTION"
        closeTo="/transactions"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/transactions')}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              Create Transaction
            </Button>
          </>
        }
      >
        <FormField label="Type">
          <select value={form.type} onChange={(e) => update('type', e.target.value)}>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Product Name">
          <select value={form.productId} onChange={(e) => update('productId', e.target.value)} required>
            <option value="" disabled>
              Select product
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Quantity">
          <input
            type="number"
            min="0"
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            required
          />
        </FormField>

        {form.type === 'Orders' && (
          <FormField label="Bin Location">
            <input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="LOC-A1" />
          </FormField>
        )}
        {form.type === 'Orders' && selectedProduct && (
          <FormField
            label={isPerishableOrder ? 'Expiry Date (required — Class C)' : 'Expiry Date (n/a for this product)'}
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

        <p style={{ fontSize: 13, color: 'var(--color-navy-400)', marginTop: 4 }}>
          {form.type === 'Orders'
            ? 'Stock is added once this Order reaches "Received".'
            : 'Stock is removed once this transaction reaches "Shipped".'}
        </p>
      </FormPanel>
    </form>
  );
}
