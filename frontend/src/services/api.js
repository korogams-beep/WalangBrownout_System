/**
 * src/services/api.js
 *
 * Centralised Axios client for the Walang Brownout Laravel REST API.
 *
 * ISSUE-001 fix: replaces the old static-mock-data dependency with a proper
 * HTTP service layer that:
 *  - points at VITE_API_BASE_URL (set per environment in .env.development /
 *    .env.production)
 *  - attaches the Sanctum Bearer token from localStorage on every request
 *  - maps backend snake_case fields to frontend camelCase (ISSUE-003 fix)
 *  - exposes named functions so callers never construct URLs themselves
 */

import axios from 'axios';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach the Bearer token from localStorage on every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// ISSUE-003 fix: data normalisation adapter
//
// The backend uses descriptive product IDs (e.g. "AC-PORT-01", "FILT-CARBON-01")
// and snake_case field names, while the legacy frontend expected "PID-xxx" IDs
// and camelCase props.  These mappers let the rest of the UI code keep using
// camelCase props seamlessly once the real API is wired in.
// ---------------------------------------------------------------------------

/**
 * Maps a single product object from the API (snake_case) to the shape the
 * frontend components expect (camelCase).
 *
 * @param {object} p - raw product from backend JSON
 * @returns {object} normalised product
 */
export function normaliseProduct(p) {
  return {
    // Keep the real backend ID — no longer rewrite to PID- format.
    id: p.product_id ?? p.id,
    name: p.name,
    sku: p.sku ?? null,
    // Map abc_class → category string the UI understands
    category: abcClassToCategory(p.abc_class),
    abcClass: p.abc_class,
    unitPrice: parseFloat(p.unit_price ?? 0),
    unitCost: parseFloat(p.unit_cost ?? 0),
    // Map is_perishable / shelf_life_days → shelfLifeMonths (legacy prop)
    shelfLifeMonths: p.shelf_life_days ? Math.round(p.shelf_life_days / 30) : null,
    isPerishable: Boolean(p.is_perishable),
    isSeasonal: Boolean(p.is_seasonal),
    // inventory row may be nested or in a separate call
    qtyOnHand: p.inventory?.quantity_on_hand ?? p.quantity_on_hand ?? 0,
    qtyCommitted: p.inventory?.quantity_committed ?? p.quantity_committed ?? 0,
    warehouse: p.warehouse ?? 'Main Warehouse',
    description: p.description ?? '',
    supplierLeadTimeDays: p.supplier_lead_time_days ?? null,
  };
}

/**
 * Converts the backend abc_class enum ('A' | 'B' | 'C') to the display
 * category strings the UI components use.
 *
 * @param {string} abcClass
 * @returns {string}
 */
function abcClassToCategory(abcClass) {
  switch (abcClass) {
    case 'A': return 'Group A (AC)';
    case 'B': return 'Group B (Purifier)';
    case 'C': return 'Group C (Filter)';
    default:  return 'Uncategorised';
  }
}

/**
 * Maps a single inventory row from the API to the frontend shape.
 *
 * @param {object} inv - raw inventory row from backend JSON
 * @returns {object}
 */
export function normaliseInventory(inv) {
  return {
    productId: inv.product_id,
    qtyOnHand: inv.quantity_on_hand ?? 0,
    qtyCommitted: inv.quantity_committed ?? 0,
    safetyStock: inv.safety_stock ?? 0,
    atp: (inv.quantity_on_hand ?? 0) - (inv.quantity_committed ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

/**
 * POST /auth/login
 * Stores the returned token in localStorage so the request interceptor picks
 * it up automatically on all subsequent calls.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export async function apiLogin(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  const token = data.data.token;
  localStorage.setItem('wb_token', token);
  return { token, user: data.data.user };
}

/**
 * POST /auth/logout
 * Clears the stored token from localStorage.
 */
export async function apiLogout() {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('wb_token');
  }
}

/**
 * GET /auth/user
 * Returns the currently authenticated user profile.
 *
 * @returns {Promise<object>}
 */
export async function apiGetCurrentUser() {
  const { data } = await api.get('/auth/user');
  return data.data;
}

// ---------------------------------------------------------------------------
// Products endpoints
// ---------------------------------------------------------------------------

/**
 * GET /products
 * Returns all products with their inventory rows, normalised to camelCase.
 *
 * @returns {Promise<object[]>}
 */
export async function apiGetProducts() {
  const { data } = await api.get('/products');
  const products = data.data ?? data;
  return Array.isArray(products) ? products.map(normaliseProduct) : [];
}

/**
 * GET /products/:id
 *
 * @param {string} productId
 * @returns {Promise<object>}
 */
export async function apiGetProduct(productId) {
  const { data } = await api.get(`/products/${productId}`);
  return normaliseProduct(data.data ?? data);
}

/**
 * POST /products
 *
 * @param {object} payload - camelCase product fields
 * @returns {Promise<object>}
 */
export async function apiCreateProduct(payload) {
  const { data } = await api.post('/products', toSnakeCase(payload));
  return normaliseProduct(data.data ?? data);
}

/**
 * PUT /products/:id
 *
 * @param {string} productId
 * @param {object} payload - camelCase product fields
 * @returns {Promise<object>}
 */
export async function apiUpdateProduct(productId, payload) {
  const { data } = await api.put(`/products/${productId}`, toSnakeCase(payload));
  return normaliseProduct(data.data ?? data);
}

/**
 * DELETE /products/:id
 *
 * @param {string} productId
 */
export async function apiDeleteProduct(productId) {
  await api.delete(`/products/${productId}`);
}

// ---------------------------------------------------------------------------
// Inventory endpoints
// ---------------------------------------------------------------------------

/**
 * GET /inventory
 *
 * @returns {Promise<object[]>}
 */
export async function apiGetInventory() {
  const { data } = await api.get('/inventory');
  const rows = data.data ?? data;
  return Array.isArray(rows) ? rows.map(normaliseInventory) : [];
}

// ---------------------------------------------------------------------------
// Transaction endpoints
// ---------------------------------------------------------------------------

/**
 * GET /transactions
 *
 * @returns {Promise<object[]>}
 */
export async function apiGetTransactions() {
  const { data } = await api.get('/transactions');
  return data.data ?? data ?? [];
}

/**
 * POST /transactions/receive
 */
export async function apiReceive(payload) {
  const { data } = await api.post('/transactions/receive', payload);
  return data;
}

/**
 * POST /transactions/commit
 */
export async function apiCommit(payload) {
  const { data } = await api.post('/transactions/commit', payload);
  return data;
}

/**
 * POST /transactions/pick
 */
export async function apiPick(payload) {
  const { data } = await api.post('/transactions/pick', payload);
  return data;
}

/**
 * POST /transactions/adjust
 */
export async function apiAdjust(payload) {
  const { data } = await api.post('/transactions/adjust', payload);
  return data;
}

// ---------------------------------------------------------------------------
// Batches endpoints
// ---------------------------------------------------------------------------

/**
 * GET /batches
 *
 * @returns {Promise<object[]>}
 */
export async function apiGetBatches() {
  const { data } = await api.get('/batches');
  return data.data ?? data ?? [];
}

// ---------------------------------------------------------------------------
// Reorder alerts endpoint
// ---------------------------------------------------------------------------

/**
 * GET /reorder-alerts
 *
 * @returns {Promise<object[]>}
 */
export async function apiGetReorderAlerts() {
  const { data } = await api.get('/reorder-alerts');
  return data.data ?? data ?? [];
}

// ---------------------------------------------------------------------------
// Utility: camelCase → snake_case payload converter
// Keeps the API calls clean — callers pass camelCase, the adapter converts.
// ---------------------------------------------------------------------------

/**
 * Shallow-converts camelCase keys to snake_case for backend payloads.
 * Handles one level of nesting; deep nesting should be handled explicitly.
 *
 * @param {object} obj
 * @returns {object}
 */
function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`),
      value,
    ])
  );
}

export default api;
