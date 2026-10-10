// API integration point for the WalangBrownout Inventory System.
// All context files should call through here when Module 2 (Laravel/Sanctum backend) is ready.
// Replace each stub body with a real fetch() call — no other file needs to change.

import { mockProducts } from '../data/mockData.js';

// ISSUE-001: stub — returns mock product list.
// TODO: replace with real API call to /api/products
export async function fetchProducts() {
  return mockProducts;
}

// ISSUE-001: stub — no seed transactions; they are built in-memory by InventoryContext.
// TODO: replace with real API call to /api/transactions
export async function fetchTransactions() {
  return [];
}

// ISSUE-001: stub — returns the two seed suppliers currently hardcoded in InventoryContext.jsx.
// TODO: replace with real API call to /api/suppliers
export async function fetchSuppliers() {
  return [
    { name: 'CoolAire Distributors', contactPerson: 'Juan dela Cruz', phone: '09171234567', email: 'juan@coolairedist.com', address: 'Quezon City, Metro Manila' },
    { name: 'PureBreeze Supply Co.', contactPerson: 'Maria Santos', phone: '09281234567', email: 'maria@purebreeze.ph', address: 'Cebu City, Cebu' },
  ];
}

// ISSUE-001: stub — validates against the INITIAL_USERS logic in AuthContext.jsx.
// TODO: replace with real API call to /api/auth/login (Laravel Sanctum)
export async function login(username, password) {
  // Stub: real implementation lives in AuthContext.jsx login() action.
  // This function exists so AuthContext can be switched to call here in Module 2.
  void username; void password;
  return { ok: false, user: null };
}

// ISSUE-001: stub — registration endpoint placeholder.
// TODO: replace with real API call to /api/auth/register
export async function register(username, password, role) {
  // Stub: real implementation lives in AuthContext.jsx register() action.
  void username; void password; void role;
  return { ok: true };
}

// --- ISSUE-002: Role normalisation ---

// Maps any capitalisation variant from the Laravel backend to the frontend's
// lowercase convention: 'Admin' → 'admin', 'Manager' → 'manager', 'Staff' → 'staff'.
export function normalizeRole(role) {
  if (!role) return 'staff';
  return role.toLowerCase(); // maps 'Admin' → 'admin', 'Manager' → 'manager', etc.
}

// Documents the expected backend → frontend role mapping.
export const BACKEND_ROLE_MAP = {
  Admin: 'admin',
  Manager: 'manager',
  Staff: 'staff',
};

// --- ISSUE-003: Product ID normalisation ---

// ISSUE-003: normalise any backend product ID to the PID- format.
export function normalizeProductId(id) {
  if (!id) return id;
  if (id.startsWith('PID-')) return id;
  // TODO: map backend-specific prefixes (AC-PORT-, FILT-, etc.) to PID- here
  // once the real backend ID format is confirmed.
  return `PID-${id}`;
}
