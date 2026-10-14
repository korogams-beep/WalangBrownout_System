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
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://wbimsbackend-production.up.railway.app/api/v1',
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

/**
 * Extracts a human-readable error message from an Axios error response,
 * accommodating Laravel's RFC 7807 error envelope { error: { message, fields } }
 * as well as standard Laravel validation errors { message, errors }.
 */
export function getApiErrorMessage(err, fallback = 'An unexpected error occurred.') {
  if (!err) return fallback;
  const res = err.response;
  if (!res) {
    if (err.code === 'ERR_NETWORK') return 'Cannot connect to server. Please check your internet connection.';
    return err.message || fallback;
  }
  const data = res.data;
  // 1. Validation fields from RFC 7807 envelope
  if (data?.error?.fields && typeof data.error.fields === 'object') {
    const firstField = Object.values(data.error.fields)[0];
    if (Array.isArray(firstField) && firstField[0]) return firstField[0];
  }
  // 2. Standard Laravel validation errors object
  if (data?.errors && typeof data.errors === 'object') {
    const firstField = Object.values(data.errors)[0];
    if (Array.isArray(firstField) && firstField[0]) return firstField[0];
  }
  // 3. RFC 7807 error message
  if (data?.error?.message) return data.error.message;
  // 4. Standard Laravel message
  if (data?.message) return data.message;
  // 5. HTTP status code fallbacks
  if (res.status === 401) return 'Session expired or unauthenticated. Please log in again.';
  if (res.status === 403) return 'You do not have permission to perform this action.';
  if (res.status === 404) return 'The requested resource was not found.';
  if (res.status === 422) return 'Invalid input data provided.';
  return fallback;
}

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
/**
 * Stores the returned token in localStorage so the request interceptor picks
 * it up automatically on all subsequent calls.
 *
 * @param {string} identifier - Email or username
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export async function apiLogin(identifier, password) {
  const { data } = await api.post('/auth/login', {
    email: identifier,
    username: identifier,
    password,
  });
  const token = data.data.token;
  localStorage.setItem('wb_token', token);
  return { token, user: data.data.user };
}

/**
 * POST /auth/register
 * Registers a new user into MySQL and stores the returned auth token.
 *
 * @param {{ username: string, password: string, email?: string, role?: string }} payload
 * @returns {Promise<{token: string, user: object}>}
 */
export async function apiRegister(payload) {
  const { data } = await api.post('/auth/register', {
    username: payload.username,
    password: payload.password,
    email: payload.email,
    role: payload.role || 'staff',
  });
  const token = data.data?.token;
  if (token) {
    localStorage.setItem('wb_token', token);
  }
  return data.data;
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
// User Management (Account Management — MySQL)
// ---------------------------------------------------------------------------

/**
 * Normalises a raw user record from MySQL to frontend camelCase shape.
 */
export function normaliseUser(u) {
  return {
    id: u.id,
    username: u.name || u.email?.split('@')[0],
    name: u.name,
    email: u.email,
    role: u.role,
    active: Boolean(u.active ?? true),
    createdAt: u.created_at,
  };
}

/**
 * GET /users
 * Returns all user accounts directly from MySQL.
 *
 * @returns {Promise<object[]>}
 */
export async function apiGetUsers() {
  const { data } = await api.get('/users');
  const list = data.data ?? data;
  return Array.isArray(list) ? list.map(normaliseUser) : [];
}

/**
 * POST /users
 * Admin creates a new user account in MySQL.
 */
export async function apiCreateUser(payload) {
  const body = {
    name: (payload.username || payload.name || '').trim(),
    password: payload.password,
    role: payload.role || 'staff',
    active: payload.active ?? true,
  };
  if (payload.email && payload.email.trim()) {
    body.email = payload.email.trim();
  }
  const { data } = await api.post('/users', body);
  return normaliseUser(data.data ?? data);
}

/**
 * PUT /users/:id
 * Admin updates role, status (active/inactive), or name in MySQL.
 */
export async function apiUpdateUser(id, payload) {
  const { data } = await api.put(`/users/${id}`, payload);
  return normaliseUser(data.data ?? data);
}

/**
 * DELETE /users/:id
 * Admin removes an account from MySQL.
 */
export async function apiDeleteUser(id) {
  const { data } = await api.delete(`/users/${id}`);
  return data;
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
 * Normalises a batch record from MySQL to frontend camelCase shape.
 */
export function normaliseBatch(b) {
  return {
    batchId: b.batch_id ?? b.batchId,
    productId: b.product_id ?? b.productId,
    batchNumber: b.batch_number ?? b.batchNumber,
    dateReceived: b.date_received ?? b.dateReceived,
    expiryDate: b.expiry_date ?? b.expiryDate,
    quantityReceived: b.quantity_received ?? b.quantityReceived,
    quantityRemains: b.quantity_remains ?? b.quantityRemains ?? 0,
    binLocation: b.bin_location ?? b.binLocation,
  };
}

/**
 * GET /batches
 *
 * @returns {Promise<object[]>}
 */
export async function apiGetBatches() {
  const { data } = await api.get('/batches');
  const list = data.data ?? data ?? [];
  return Array.isArray(list) ? list.map(normaliseBatch) : [];
}

/**
 * POST /batches
 * Primary stock-in endpoint: records new lot and RECEIVE transaction in MySQL.
 */
export async function apiReceiveBatch(payload) {
  const { data } = await api.post('/batches', {
    product_id: payload.productId,
    batch_number:
      payload.batchNumber ||
      payload.batchId ||
      'LOT-' + Date.now().toString().slice(-6),
    date_received: payload.dateReceived
      ? payload.dateReceived.split('T')[0]
      : new Date().toISOString().split('T')[0],
    expiry_date: payload.expiryDate ? payload.expiryDate.split('T')[0] : null,
    quantity: payload.qty || payload.quantity,
    bin_location: payload.location || 'Aisle 1',
    po_reference: payload.poReference || 'PO-' + Date.now().toString().slice(-5),
  });
  return data;
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
