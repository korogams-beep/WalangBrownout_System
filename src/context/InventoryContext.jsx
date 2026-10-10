import { createContext, useContext, useMemo, useReducer } from 'react';
import { mockProducts } from '../data/mockData.js';
import {
  classifyProduct,
  isPerishable,
  isSeasonal,
  generateReorderRule,
  getNextFifoBatch,
  getNextStatus,
  STOCK_EFFECT_STEP,
} from '../utils/inventoryLogic.js';

// API integration point: see src/services/api.js.
// Replace stub implementations there to connect to the real Laravel backend.

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
function makeRuleId(productId) {
  return `ROZ-${productId.replace('PID-', '')}`;
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
    case 'ADD_PRODUCT': {
      const { product } = action.payload;
      const startingQty = Number(product.qtyOnHand) || 0;
      // ISSUE-003: enforce PID- prefix — the canonical product ID format for this system.
      const safeId = product.id?.startsWith('PID-') ? product.id : `PID-${product.id}`;
      const classifiedProduct = {
        ...product,
        id: safeId,
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

    case 'ADD_SUPPLIER': {
      const { supplier } = action.payload;
      return { ...state, suppliers: [...state.suppliers, { ...supplier, id: makeSupplierId() }] };
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

  const actions = useMemo(
    () => ({
      addProduct: (product) => dispatch({ type: 'ADD_PRODUCT', payload: { product } }),
      deleteProduct: (productId) => dispatch({ type: 'DELETE_PRODUCT', payload: { productId } }),
      editProduct: (product) => dispatch({ type: 'EDIT_PRODUCT', payload: { product } }),
      addReorderRule: (rule) => dispatch({ type: 'ADD_REORDER_RULE', payload: { rule } }),
      regenerateReorderRules: () => dispatch({ type: 'REGENERATE_REORDER_RULES' }),
      createTransaction: (payload) => dispatch({ type: 'CREATE_TRANSACTION', payload }),
      advanceTransaction: (transactionId) => dispatch({ type: 'ADVANCE_TRANSACTION', payload: { transactionId } }),
      addSupplier: (supplier) => dispatch({ type: 'ADD_SUPPLIER', payload: { supplier } }),
      editSupplier: (supplier) => dispatch({ type: 'EDIT_SUPPLIER', payload: { supplier } }),
      deleteSupplier: (supplierId) => dispatch({ type: 'DELETE_SUPPLIER', payload: { supplierId } }),
    }),
    []
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within an <InventoryProvider>');
  return ctx;
}
