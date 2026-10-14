/**
 * InventoryContext.jsx
 *
 * ISSUE-001 / ISSUE-003 note:
 *   This context currently seeds from static mockData (frontend-only mode).
 *   When the backend integration is enabled, swap `buildInitialState` to call
 *   `apiGetProducts()` and `apiGetInventory()` from src/services/api.js, and
 *   replace dispatch actions with the corresponding API calls.
 *   The normaliseProduct() adapter in api.js already handles the backend
 *   product-ID format (AC-PORT-01, FILT-CARBON-01, etc.) and maps
 *   snake_case → camelCase so no further changes are needed in the UI components.
 */

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { mockProducts } from '../data/mockData.js';
import {
  apiGetProducts,
  apiGetInventory,
  apiGetBatches,
  apiGetTransactions,
  apiGetSuppliers,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct,
  apiCreateTransaction,
  apiUpdateTransaction,
  apiDeleteTransaction,
  apiCreateSupplier,
  apiUpdateSupplier,
  apiDeleteSupplier,
  apiCommit,
  apiPick,
  apiReceiveBatch,
} from '../services/api.js';
import {
  classifyProduct,
  isPerishable,
  isSeasonal,
  generateReorderRule,
  getNextFifoBatch,
  getNextStatus,
  STOCK_EFFECT_STEP,
} from '../utils/inventoryLogic.js';

const InventoryContext = createContext(null);

let nextTxnId = 1;
let nextBatchId = 1;
let nextSupplierId = 1;
function makeSupplierId() {
  return `SUP-${String(nextSupplierId++).padStart(3, '0')}`;
}
function makeTransactionId() {
  return `T-${String(nextTxnId++).padStart(3, '0')}`;
}
function makeBatchId(productId) {
  return `BATCH-${productId}-${String(nextBatchId++).padStart(3, '0')}`;
}
/**
 * Generates a reorder-rule ID from a product ID.
 *
 * ISSUE-003 fix: previously assumed all product IDs used the "PID-" prefix
 * (e.g. "PID-001" → "ROZ-001"). The backend uses descriptive IDs like
 * "AC-PORT-01" or "FILT-CARBON-01", so we now just prefix with "ROZ-"
 * directly — no stripping needed.
 */
function makeRuleId(productId) {
  return `ROZ-${productId}`;
}

// Applies a transaction's real inventory effect the moment it reaches its
// "stock effect" step (Received for an Order, Shipped for a Sale/Return).
// Every step before that is just a status change with no inventory impact.
function applyStockEffect(state, txn) {
  const product = state.products.find((p) => p.id === txn.productId);
  let inventory = state.inventory;
  let batches = state.batches;
  let batchId = txn.batchId;

  if (txn.type === 'Orders') {
    inventory = {
      ...inventory,
      [txn.productId]: {
        ...inventory[txn.productId],
        qtyOnHand: inventory[txn.productId].qtyOnHand + txn.qty,
      },
    };
    if (product && isPerishable(product)) {
      const months = product.shelfLifeMonths || 9;
      const expiry = txn.expiryDate ? new Date(txn.expiryDate) : new Date();
      if (!txn.expiryDate) expiry.setDate(expiry.getDate() + months * 30);
      const batch = {
        batchId: makeBatchId(txn.productId),
        productId: txn.productId,
        dateReceived: new Date().toISOString(),
        expiryDate: expiry.toISOString(),
        quantityRemains: txn.qty,
      };
      batches = [...batches, batch];
      batchId = batch.batchId;
    }
  } else {
    // Sale or Return — stock leaving the warehouse.
    const current = inventory[txn.productId];
    inventory = {
      ...inventory,
      [txn.productId]: {
        ...current,
        qtyOnHand: Math.max(0, current.qtyOnHand - txn.qty),
        // A Sale committed this qty back at "Open" (see CREATE_TRANSACTION);
        // shipping resolves that commitment. Returns never committed anything.
        qtyCommitted: txn.type === 'Sale' ? Math.max(0, current.qtyCommitted - txn.qty) : current.qtyCommitted,
      },
    };
    if (product && isPerishable(product)) {
      const batch = getNextFifoBatch(batches, txn.productId);
      if (batch) {
        batches = batches.map((b) =>
          b.batchId === batch.batchId ? { ...b, quantityRemains: Math.max(0, b.quantityRemains - txn.qty) } : b
        );
        batchId = batch.batchId;
      }
    }
  }

  return { inventory, batches, batchId };
}

// Every product starts as a completed "Orders" transaction (it's already on
// the shelf, so there's nothing left to advance through), which is also
// where perishable (Class C) items get their first BatchID + expiry, and
// every product gets an automatically generated reorder rule (Section III) —
// no manual season/lead-time entry required.
function buildInitialState() {
  const products = mockProducts.map((p) => ({ ...p, productClass: classifyProduct(p), seasonal: isSeasonal(p) }));
  const inventory = {};
  const batches = [];
  const transactions = [];
  const reorderRules = [];

  products.forEach((product) => {
    inventory[product.id] = { productId: product.id, qtyOnHand: product.qtyOnHand, qtyCommitted: 0 };

    const txn = {
      id: makeTransactionId(),
      type: 'Orders',
      status: 'Completed',
      productId: product.id,
      qty: product.qtyOnHand,
      dateTime: new Date().toISOString(),
    };

    if (isPerishable(product)) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 270); // default 9-month shelf life; overridable at creation
      const batch = {
        batchId: makeBatchId(product.id),
        productId: product.id,
        dateReceived: new Date().toISOString(),
        expiryDate: expiry.toISOString(),
        quantityRemains: product.qtyOnHand,
      };
      batches.push(batch);
      txn.batchId = batch.batchId;
    }

    transactions.push(txn);
    reorderRules.push(generateReorderRule(product, { id: makeRuleId(product.id) }));
  });

  // Seed suppliers
  const suppliers = [
    { id: makeSupplierId(), name: 'CoolAire Distributors', contactPerson: 'Juan dela Cruz', phone: '09171234567', email: 'juan@coolairedist.com', address: 'Quezon City, Metro Manila' },
    { id: makeSupplierId(), name: 'PureBreeze Supply Co.', contactPerson: 'Maria Santos', phone: '09281234567', email: 'maria@purebreeze.ph', address: 'Cebu City, Cebu' },
  ];

  return { products, reorderRules, inventory, batches, transactions, suppliers };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA_FROM_API': {
      const { products, inventory, batches, transactions, suppliers } = action.payload;
      const classifiedProducts = products.map((p) => ({
        ...p,
        productClass: classifyProduct(p),
        seasonal: isSeasonal(p),
      }));
      const invMap = { ...state.inventory };
      if (inventory && Array.isArray(inventory)) {
        inventory.forEach((inv) => {
          invMap[inv.productId] = inv;
        });
      } else {
        products.forEach((p) => {
          invMap[p.id] = { productId: p.id, qtyOnHand: p.qtyOnHand, qtyCommitted: p.qtyCommitted || 0 };
        });
      }
      const rules = classifiedProducts.map((p) => generateReorderRule(p, { id: makeRuleId(p.id) }));
      return {
        ...state,
        products: classifiedProducts,
        inventory: invMap,
        ...(batches && batches.length ? { batches } : {}),
        ...(transactions && transactions.length ? { transactions } : {}),
        ...(suppliers && suppliers.length ? { suppliers } : {}),
        reorderRules: rules,
      };
    }

    case 'ADD_PRODUCT': {
      const { product } = action.payload;
      const startingQty = Number(product.qtyOnHand) || 0;
      const classifiedProduct = {
        ...product,
        qtyOnHand: startingQty,
        productClass: classifyProduct(product),
        seasonal: isSeasonal(product),
      };

      const newInventory = {
        ...state.inventory,
        [classifiedProduct.id]: { productId: classifiedProduct.id, qtyOnHand: startingQty, qtyCommitted: 0 },
      };

      const txn = {
        id: makeTransactionId(),
        type: 'Orders',
        status: 'Completed',
        productId: classifiedProduct.id,
        qty: startingQty,
        dateTime: new Date().toISOString(),
      };

      let newBatches = state.batches;
      if (isPerishable(classifiedProduct) && startingQty > 0) {
        const expiry = new Date();
        const months = classifiedProduct.shelfLifeMonths || 9;
        expiry.setDate(expiry.getDate() + months * 30);
        const batch = {
          batchId: makeBatchId(classifiedProduct.id),
          productId: classifiedProduct.id,
          dateReceived: new Date().toISOString(),
          expiryDate: expiry.toISOString(),
          quantityRemains: startingQty,
        };
        newBatches = [...state.batches, batch];
        txn.batchId = batch.batchId;
      }

      // Auto-generate its reorder rule the same way every existing product
      // got one — classification decides the formula, no manual entry.
      const rule = generateReorderRule(classifiedProduct, { id: makeRuleId(classifiedProduct.id) });

      return {
        ...state,
        products: [...state.products, classifiedProduct],
        inventory: newInventory,
        batches: newBatches,
        transactions: startingQty > 0 ? [txn, ...state.transactions] : state.transactions,
        reorderRules: [...state.reorderRules, rule],
      };
    }

    case 'DELETE_PRODUCT': {
      const { productId } = action.payload;
      const newInventory = { ...state.inventory };
      delete newInventory[productId];
      return {
        ...state,
        products: state.products.filter((p) => p.id !== productId),
        inventory: newInventory,
        batches: state.batches.filter((b) => b.productId !== productId),
        transactions: state.transactions.filter((t) => t.productId !== productId),
        reorderRules: state.reorderRules.filter((r) => r.productId !== productId),
      };
    }

    case 'EDIT_PRODUCT': {
      const { product } = action.payload;
      const updated = {
        ...product,
        productClass: classifyProduct(product),
        seasonal: isSeasonal(product),
      };
      // Regenerate reorder rule to reflect any classification changes.
      const rule = generateReorderRule(updated, { id: makeRuleId(updated.id) });
      return {
        ...state,
        products: state.products.map((p) => (p.id === updated.id ? updated : p)),
        reorderRules: state.reorderRules.map((r) => (r.productId === updated.id ? rule : r)),
      };
    }

    case 'ADD_REORDER_RULE': {
      const { rule } = action.payload;
      return {
        ...state,
        reorderRules: [...state.reorderRules.filter((r) => r.productId !== rule.productId), rule],
      };
    }

    case 'REGENERATE_REORDER_RULES': {
      const reorderRules = state.products.map((p) => generateReorderRule(p, { id: makeRuleId(p.id) }));
      return { ...state, reorderRules };
    }

    // Creates a transaction at "Open" — no physical stock effect yet. A Sale
    // commits the qty immediately (case study's COMMIT trigger: protect ATP
    // the instant an order is placed, before anything is picked or shipped).
    case 'CREATE_TRANSACTION': {
      const { type, productId, qty, expiryDate, location } = action.payload;
      const txn = {
        id: makeTransactionId(),
        type,
        status: 'Open',
        productId,
        qty,
        expiryDate: expiryDate || null,
        location: location || null,
        dateTime: new Date().toISOString(),
      };

      const inventory =
        type === 'Sale'
          ? {
              ...state.inventory,
              [productId]: {
                ...state.inventory[productId],
                qtyCommitted: state.inventory[productId].qtyCommitted + qty,
              },
            }
          : state.inventory;

      return { ...state, transactions: [txn, ...state.transactions], inventory };
    }

    // Moves a transaction one step forward in its type's pipeline. If that
    // step is the type's designated "stock effect" step, applies the actual
    // inventory change at the same time.
    case 'ADVANCE_TRANSACTION': {
      const { transactionId } = action.payload;
      const txn = state.transactions.find((t) => t.id === transactionId);
      if (!txn) return state;

      const nextStatus = getNextStatus(txn.type, txn.status);
      if (!nextStatus) return state; // already Completed

      let nextState = state;
      let batchId = txn.batchId;

      if (nextStatus === STOCK_EFFECT_STEP[txn.type]) {
        const effect = applyStockEffect(state, txn);
        nextState = { ...state, inventory: effect.inventory, batches: effect.batches };
        batchId = effect.batchId;
      }

      return {
        ...nextState,
        transactions: nextState.transactions.map((t) =>
          t.id === transactionId ? { ...t, status: nextStatus, batchId } : t
        ),
      };
    }

    case 'DELETE_TRANSACTION': {
      const { transactionId } = action.payload;
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== transactionId),
      };
    }

    case 'EDIT_TRANSACTION': {
      const { transaction } = action.payload;
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === transaction.id ? { ...t, ...transaction } : t
        ),
      };
    }

    case 'SET_TRANSACTIONS': {
      const { transactions } = action.payload;
      return {
        ...state,
        transactions: transactions || state.transactions,
      };
    }

    case 'ADD_SUPPLIER': {
      const { supplier } = action.payload;
      const id = supplier.id || makeSupplierId();
      return {
        ...state,
        suppliers: [...state.suppliers.filter((s) => s.id !== id), { ...supplier, id }],
      };
    }

    case 'EDIT_SUPPLIER': {
      const { supplier } = action.payload;
      return {
        ...state,
        suppliers: state.suppliers.map((s) => (s.id === supplier.id ? { ...s, ...supplier } : s)),
      };
    }

    case 'DELETE_SUPPLIER': {
      const { supplierId } = action.payload;
      return { ...state, suppliers: state.suppliers.filter((s) => s.id !== supplierId) };
    }

    default:
      return state;
  }
}

export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  // Sync live products, inventory, transactions, and suppliers from MySQL API on mount
  useEffect(() => {
    let mounted = true;

    async function fetchFromMySQL() {
      try {
        const [prods, invs, batches, txns, supps] = await Promise.allSettled([
          apiGetProducts(),
          apiGetInventory(),
          apiGetBatches(),
          apiGetTransactions(),
          apiGetSuppliers(),
        ]);

        if (
          mounted &&
          prods.status === 'fulfilled' &&
          Array.isArray(prods.value) &&
          prods.value.length > 0
        ) {
          dispatch({
            type: 'SET_DATA_FROM_API',
            payload: {
              products: prods.value,
              inventory: invs.status === 'fulfilled' ? invs.value : null,
              batches: batches.status === 'fulfilled' ? batches.value : null,
              transactions: txns.status === 'fulfilled' && Array.isArray(txns.value) ? txns.value : null,
              suppliers: supps.status === 'fulfilled' && Array.isArray(supps.value) && supps.value.length > 0 ? supps.value : null,
            },
          });
        }
      } catch (err) {
        // Keep initial seed if backend API is not yet reachable
      }
    }

    fetchFromMySQL();
    return () => {
      mounted = false;
    };
  }, []);

  const actions = useMemo(
    () => ({
      addProduct: async (product) => {
        dispatch({ type: 'ADD_PRODUCT', payload: { product } });
        try {
          const abc =
            product.abcClass ||
            (product.category?.includes('A') ? 'A' : product.category?.includes('B') ? 'B' : 'C');
          await apiCreateProduct({
            productId: product.id,
            name: product.name,
            sku:
              product.sku ||
              product.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 15) +
                '-' +
                Math.floor(1000 + Math.random() * 9000),
            abcClass: abc,
            unitPrice: product.unitPrice || 0,
            unitCost: product.unitCost || Math.round((product.unitPrice || 0) * 0.7),
            initialStock: product.qtyOnHand || 0,
            isPerishable: Boolean(product.shelfLifeMonths),
            shelfLifeDays: product.shelfLifeMonths ? product.shelfLifeMonths * 30 : null,
            supplierLeadTimeDays: 14,
          });
        } catch (err) {
          console.warn('Product saved locally (MySQL sync failed or offline):', err?.message || err);
        }
      },
      deleteProduct: async (productId) => {
        dispatch({ type: 'DELETE_PRODUCT', payload: { productId } });
        try {
          await apiDeleteProduct(productId);
        } catch (err) {
          console.warn('Product deleted locally (MySQL sync failed or offline):', err?.message || err);
        }
      },
      editProduct: async (product) => {
        dispatch({ type: 'EDIT_PRODUCT', payload: { product } });
        try {
          const abc =
            product.abcClass ||
            (product.category?.includes('A') ? 'A' : product.category?.includes('B') ? 'B' : 'C');
          await apiUpdateProduct(product.id, {
            name: product.name,
            abcClass: abc,
            unitPrice: product.unitPrice,
            unitCost: product.unitCost ?? Math.round((product.unitPrice || 0) * 0.7),
            qtyOnHand: product.qtyOnHand,
            isPerishable: Boolean(product.shelfLifeMonths),
            shelfLifeDays: product.shelfLifeMonths ? product.shelfLifeMonths * 30 : null,
          });
        } catch (err) {
          console.warn('Product updated locally (MySQL sync failed or offline):', err?.message || err);
        }
      },
      addReorderRule: (rule) => dispatch({ type: 'ADD_REORDER_RULE', payload: { rule } }),
      regenerateReorderRules: () => dispatch({ type: 'REGENERATE_REORDER_RULES' }),
      createTransaction: async (payload) => {
        dispatch({ type: 'CREATE_TRANSACTION', payload });
        try {
          const created = await apiCreateTransaction(payload);
          if (created?.id && created.id !== payload.id) {
            const freshTxns = await apiGetTransactions();
            if (freshTxns?.length) {
              dispatch({ type: 'SET_TRANSACTIONS', payload: { transactions: freshTxns } });
            }
          }
        } catch (err) {
          console.warn('Transaction created locally (MySQL sync warning):', err?.message || err);
        }
      },
      advanceTransaction: async (transactionId) => {
        const txn = state.transactions.find((t) => t.id === transactionId);
        if (!txn) return;
        const nextStatus = getNextStatus(txn.type, txn.status);
        if (!nextStatus) return;

        dispatch({ type: 'ADVANCE_TRANSACTION', payload: { transactionId } });
        try {
          await apiUpdateTransaction(transactionId, { status: nextStatus });
        } catch (err) {
          console.warn('Advanced transaction locally (MySQL sync warning):', err?.message || err);
        }
      },
      editTransaction: async (transaction) => {
        dispatch({ type: 'EDIT_TRANSACTION', payload: { transaction } });
        try {
          await apiUpdateTransaction(transaction.id, transaction);
        } catch (err) {
          console.warn('Transaction edited locally (MySQL sync warning):', err?.message || err);
        }
      },
      deleteTransaction: async (transactionId) => {
        dispatch({ type: 'DELETE_TRANSACTION', payload: { transactionId } });
        try {
          await apiDeleteTransaction(transactionId);
        } catch (err) {
          console.warn('Transaction deleted locally (MySQL sync warning):', err?.message || err);
        }
      },
      addSupplier: async (supplier) => {
        try {
          const created = await apiCreateSupplier(supplier);
          dispatch({ type: 'ADD_SUPPLIER', payload: { supplier: created } });
          return created;
        } catch (err) {
          console.warn('Supplier created locally (MySQL sync warning):', err?.message || err);
          dispatch({ type: 'ADD_SUPPLIER', payload: { supplier } });
        }
      },
      editSupplier: async (supplier) => {
        dispatch({ type: 'EDIT_SUPPLIER', payload: { supplier } });
        try {
          await apiUpdateSupplier(supplier.id, supplier);
        } catch (err) {
          console.warn('Supplier updated locally (MySQL sync warning):', err?.message || err);
        }
      },
      deleteSupplier: async (supplierId) => {
        dispatch({ type: 'DELETE_SUPPLIER', payload: { supplierId } });
        try {
          await apiDeleteSupplier(supplierId);
        } catch (err) {
          console.warn('Supplier deleted locally (MySQL sync warning):', err?.message || err);
        }
      },
    }),
    [state.transactions]
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within an <InventoryProvider>');
  return ctx;
}
