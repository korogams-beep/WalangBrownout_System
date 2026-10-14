/**
 * src/data/mockData.js
 *
 * Streamlined seed data for frontend fallback / offline mode.
 * Contains core representative products across Category A, B, and C.
 */

export const mockProducts = [
  {
    id: 'AC-PORT-01',
    name: 'Portable Air Conditioner 1.0HP',
    category: 'Group A (AC)',
    unitPrice: 18500,
    qtyOnHand: 45,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: null,
    isPerishable: false,
    isSeasonal: true,
  },
  {
    id: 'PURIF-AIR-01',
    name: 'HEPA Air Purifier 30sqm',
    category: 'Group B (Purifier)',
    unitPrice: 6799,
    qtyOnHand: 30,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: null,
    isPerishable: false,
    isSeasonal: false,
  },
  {
    id: 'FILT-HEPA-01',
    name: 'HEPA Replacement Filter (30sqm)',
    category: 'Group C (Filter)',
    unitPrice: 899,
    qtyOnHand: 0,
    warehouse: 'Cold Storage',
    shelfLifeMonths: 9,
    isPerishable: true,
    isSeasonal: false,
  },
  {
    id: 'CLEAN-AC-01',
    name: 'AC Coil Cleaning Kit',
    category: 'Group C (Filter)',
    unitPrice: 349,
    qtyOnHand: 50,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: 9,
    isPerishable: true,
    isSeasonal: false,
  },
];
