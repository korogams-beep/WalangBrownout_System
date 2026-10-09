// Static seed data standing in for the Laravel/Eloquent backend (Module 2),
// which is out of scope for this frontend-only midterm build. Everything
// derived from a product (class, seasonality, reorder rules, ATP, etc.) is
// computed live by src/utils/inventoryLogic.js and src/context/InventoryContext.jsx
// instead of being hard-coded here.

export const mockProducts = [
  { id: 'PID-001', name: 'Window AC Unit 1HP', category: 'Group A (AC)', unitPrice: 350, qtyOnHand: 12, warehouse: 'Main Warehouse', shelfLifeMonths: null },
  { id: 'PID-002', name: 'Smart Thermostat', category: 'Group A (AC)', unitPrice: 150, qtyOnHand: 25, warehouse: 'Main Warehouse', shelfLifeMonths: null },
  { id: 'PID-003', name: 'HEPA Air Purifier', category: 'Group B (Purifier)', unitPrice: 200, qtyOnHand: 3, warehouse: 'Main Warehouse', shelfLifeMonths: null },
  { id: 'PID-004', name: 'Carbon Air Filter 16x20', category: 'Group C (Filter)', unitPrice: 25, qtyOnHand: 0, warehouse: 'Cold Storage', shelfLifeMonths: 9 },
  { id: 'PID-005', name: 'Standard Air Filter 16x20', category: 'Group C (Filter)', unitPrice: 15, qtyOnHand: 40, warehouse: 'Cold Storage', shelfLifeMonths: 9 },
  { id: 'PID-006', name: 'Portable AC Unit 0.75HP', category: 'Group A (AC)', unitPrice: 280, qtyOnHand: 6, warehouse: 'Main Warehouse', shelfLifeMonths: null },
];
