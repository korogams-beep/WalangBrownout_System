/**
 * src/data/mockData.js
 *
 * Static seed data for frontend-only / offline mode.
 *
 * ISSUE-003 fix: product IDs now match the backend ProductSeeder format
 * (e.g. "AC-PORT-01", "FILT-CARBON-01") instead of the old "PID-xxx" scheme.
 * This ensures that when the frontend switches from mock data to the live API
 * (ISSUE-001), reorder-rule IDs, batch IDs, and any cross-references remain
 * consistent across both modes.
 *
 * Fields mirror the normalised shape returned by normaliseProduct() in
 * src/services/api.js so components work identically with mock data and
 * live API responses.
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
    id: 'AC-PORT-02',
    name: 'Portable Air Conditioner 1.5HP',
    category: 'Group A (AC)',
    unitPrice: 24999,
    qtyOnHand: 30,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: null,
    isPerishable: false,
    isSeasonal: true,
  },
  {
    id: 'THERM-SMART-01',
    name: 'Smart WiFi Thermostat Pro',
    category: 'Group A (AC)',
    unitPrice: 4850,
    qtyOnHand: 80,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: null,
    isPerishable: false,
    isSeasonal: false,
  },
  {
    id: 'THERM-SMART-02',
    name: 'Smart Thermostat Basic',
    category: 'Group A (AC)',
    unitPrice: 2299,
    qtyOnHand: 120,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: null,
    isPerishable: false,
    isSeasonal: false,
  },
  {
    id: 'PURIF-AIR-01',
    name: 'HEPA Air Purifier 30sqm',
    category: 'Group B (Purifier)',
    unitPrice: 6799,
    qtyOnHand: 60,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: null,
    isPerishable: false,
    isSeasonal: false,
  },
  {
    id: 'PURIF-AIR-02',
    name: 'HEPA Air Purifier 50sqm',
    category: 'Group B (Purifier)',
    unitPrice: 11500,
    qtyOnHand: 35,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: null,
    isPerishable: false,
    isSeasonal: false,
  },
  {
    id: 'FAN-STAND-01',
    name: 'Industrial Stand Fan 18"',
    category: 'Group B (Purifier)',
    unitPrice: 2199,
    qtyOnHand: 90,
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
    id: 'FILT-HEPA-02',
    name: 'HEPA Replacement Filter (50sqm)',
    category: 'Group C (Filter)',
    unitPrice: 1250,
    qtyOnHand: 0,
    warehouse: 'Cold Storage',
    shelfLifeMonths: 9,
    isPerishable: true,
    isSeasonal: false,
  },
  {
    id: 'FILT-CARBON-01',
    name: 'Carbon Replacement Filter (Universal)',
    category: 'Group C (Filter)',
    unitPrice: 649,
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
    qtyOnHand: 150,
    warehouse: 'Main Warehouse',
    shelfLifeMonths: null,
    isPerishable: false,
    isSeasonal: false,
  },
];
