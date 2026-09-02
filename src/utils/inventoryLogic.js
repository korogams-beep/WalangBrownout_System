// Pure, framework-free business logic pulled from the case study blueprint
// (ABC classification, ATP, seasonal/non-seasonal ROP, FIFO batch selection).
// Kept separate from the hook so it's easy to unit-test on its own.

export const PRODUCT_CLASS = {
  A: 'Class A',
  B: 'Class B',
  C: 'Class C',
};

// Case study: Class A = AC units + Thermostats, Class B = Air Purifiers, Class C = Filters
// Reads both name and category so a freshly-typed product (Add New Product
// form) classifies correctly even before its name alone is a clean match.
export function classifyProduct(product) {
  const text = `${product.name || ''} ${product.category || ''}`.toLowerCase();
  if (text.includes('filter')) return PRODUCT_CLASS.C;
  if (text.includes('purifier')) return PRODUCT_CLASS.B;
  return PRODUCT_CLASS.A; // AC units, thermostats
}

export function isPerishable(product) {
  return classifyProduct(product) === PRODUCT_CLASS.C;
}

export function isSeasonal(product) {
  return product.name.toLowerCase().includes('ac unit') || product.name.toLowerCase().includes('air con');
}

// ATP = QuantityOnHand - QuantityCommitted (case study Section II-B)
export function calculateATP(inventoryRow) {
  return inventoryRow.qtyOnHand - inventoryRow.qtyCommitted;
}

export function fulfillmentStatus(inventoryRow) {
  const atp = calculateATP(inventoryRow);
  if (inventoryRow.qtyOnHand === 0) return 'Out of Stock';
  if (atp <= 0) return 'Low Stock';
  if (inventoryRow.qtyOnHand <= inventoryRow.rop) return 'Reorder Alert';
  return 'OK';
}

// --- Reorder Point formulas (Section III) ---

// SS = (MaxDailyDemand x MaxLeadTime) - (AvgDailyDemand x AvgLeadTime)
export function calculateSafetyStock({ maxDailyDemand, maxLeadTime, avgDailyDemand, avgLeadTime }) {
  return maxDailyDemand * maxLeadTime - avgDailyDemand * avgLeadTime;
}

// Non-seasonal: ROP = (d x LT) + SS
export function calculateNonSeasonalROP({ avgDailyDemand, leadTime, safetyStock }) {
  return avgDailyDemand * leadTime + safetyStock;
}

// SI_m = Average Demand of Month m / Overall Monthly Average Demand
export function calculateSeasonalIndex(monthlyDemand, overallMonthlyAverage) {
  return monthlyDemand / overallMonthlyAverage;
}

// Seasonal ROP = (d_seasonal x LT) + SS_seasonal, where
// d_seasonal = (AnnualBaseDemand / 365) x SI_m
export function calculateSeasonalROP({ annualBaseDemand, seasonalIndex, leadTime, seasonalSafetyStock }) {
  const dSeasonal = (annualBaseDemand / 365) * seasonalIndex;
  return dSeasonal * leadTime + seasonalSafetyStock;
}

// --- FIFO batch selection (Section I-B) ---

// Returns the oldest unexpired batch with remaining stock for a product,
// i.e. the one FIFO picking rules say to pull from next.
export function getNextFifoBatch(batches, productId, asOfDate = new Date()) {
  return batches
    .filter((b) => b.productId === productId && b.quantityRemains > 0 && new Date(b.expiryDate) >= asOfDate)
    .sort((a, b) => new Date(a.dateReceived) - new Date(b.dateReceived))[0] || null;
}

export function daysUntilExpiry(expiryDate, asOfDate = new Date()) {
  const ms = new Date(expiryDate) - asOfDate;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// Soonest-expiring, non-empty batch for a product — feeds the "Expiry Date" /
// "Days to Expiry" columns on UI Products and UI Dashboard. Non-perishable
// products simply have no batches, so this returns null for them.
export function getSoonestExpiringBatch(batches, productId) {
  return batches
    .filter((b) => b.productId === productId && b.quantityRemains > 0)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0] || null;
}

// Most recent transaction touching a product — feeds "Last Updated" on UI Products.
export function getLastUpdated(transactions, productId) {
  const rows = transactions.filter((t) => t.productId === productId);
  if (rows.length === 0) return null;
  return rows.reduce((latest, t) => (new Date(t.dateTime) > new Date(latest.dateTime) ? t : latest)).dateTime;
}

// Rough seasonal curve for AC units taken from the case study's Operational
// Simulation Model (Section III-C) — swap for real historical sales data once
// the "mandatory data-auditing phase" (Section IV, Risk 2) is complete.
const MOCK_SEASONAL_INDEX_BY_MONTH = [0.6, 0.7, 1.0, 2.4, 2.4, 1.6, 0.9, 0.6, 0.2, 0.2, 0.4, 0.5];

export function getSeasonalIndexForMonth(monthIndex = new Date().getMonth()) {
  return MOCK_SEASONAL_INDEX_BY_MONTH[monthIndex];
}

// --- Transaction lifecycle ---
//
// Two directions, each a fixed pipeline of statuses:
// - "Orders" is Supplier -> Warehouse (stock coming in).
// - "Sale" and "Returns" are both Warehouse -> outbound (to a Buyer or back
//   to a Supplier), so they share the same pipeline.
// A transaction always starts at "Open" and is advanced one step at a time
// (see advanceTransaction in InventoryContext) rather than landing on a
// final status the instant it's created.
export const TRANSACTION_TYPES = ['Orders', 'Sale', 'Returns'];

export const TRANSACTION_STATUS_FLOW = {
  Orders: ['Open', 'Ordered', 'Received', 'Completed'],
  Sale: ['Open', 'Picked', 'Shipped', 'Completed'],
  Returns: ['Open', 'Picked', 'Shipped', 'Completed'],
};

// The step in each pipeline where the transaction actually changes physical
// stock: an Order adds stock once it's Received; a Sale/Return removes stock
// once it's Shipped. Every step before that is just a status change.
export const STOCK_EFFECT_STEP = {
  Orders: 'Received',
  Sale: 'Shipped',
  Returns: 'Shipped',
};

export function getNextStatus(type, currentStatus) {
  const flow = TRANSACTION_STATUS_FLOW[type];
  if (!flow) return null;
  const idx = flow.indexOf(currentStatus);
  if (idx === -1 || idx === flow.length - 1) return null; // unknown status, or already Completed
  return flow[idx + 1];
}

// --- Automated reorder-rule generation (Section I-A + Section III) ---
//
// The case study's ABC table assigns every product class its own review
// cadence, and Section III-C's Operational Simulation Model gives concrete
// demand/lead-time/safety-stock figures per product type. This turns both
// into a single function so a reorder rule can be generated the instant a
// product is classified — no manual season/lead-time guesswork required.

// Review cadence text, straight from the Section I-A "Control Strategy &
// Review Cycle" column.
export const REVIEW_CYCLE_BY_CLASS = {
  [PRODUCT_CLASS.A]: 'Continuous real-time tracking, weekly review',
  [PRODUCT_CLASS.B]: 'Bi-weekly automated reorder review',
  [PRODUCT_CLASS.C]: 'Automated monthly replenishment (FIFO enforced)',
};

// Baseline demand / lead-time / safety-stock figures per product type, taken
// directly from Section III-C's Operational Simulation Model table.
function baselineReorderParams(product, month) {
  const klass = classifyProduct(product);
  const seasonal = isSeasonal(product);
  const seasonalIndex = getSeasonalIndexForMonth(month);

  if (klass === PRODUCT_CLASS.A && seasonal) {
    // Portable AC Units — Section III-C "Pre-Peak" / "Off-Peak" rows. Safety
    // stock itself flexes with the season, matching the ABC table's
    // "seasonally dynamic safety stock calculations" control strategy.
    return {
      avgDailyUsage: 15,
      leadTimeDays: 14,
      seasonStart: 'March',
      seasonEnd: 'May',
      safetyStock: seasonalIndex >= 1.5 ? 50 : 15,
    };
  }
  if (klass === PRODUCT_CLASS.A) {
    // Smart Thermostats — Section III-C "Non-Seasonal (Standard)" row.
    return { avgDailyUsage: 2, leadTimeDays: 10, seasonStart: null, seasonEnd: null, safetyStock: 10 };
  }
  if (klass === PRODUCT_CLASS.B) {
    // Air Purifiers — Class B: moderate unit value, stable non-seasonal demand.
    return { avgDailyUsage: 1, leadTimeDays: 12, seasonStart: null, seasonEnd: null, safetyStock: 5 };
  }
  // Replacement Filters — Class C: high purchase volume, perishable,
  // automated monthly replenishment.
  return { avgDailyUsage: 4, leadTimeDays: 6, seasonStart: null, seasonEnd: null, safetyStock: 10 };
}

// Builds a complete, ready-to-save reorder rule for a product with zero
// manual input: classification decides the review cadence and baseline
// demand figures, and the case study's Section III formulas turn those into
// a Reorder Point — seasonal formula for seasonal items, flat formula for
// everything else.
export function generateReorderRule(product, { month = new Date().getMonth(), id } = {}) {
  const seasonal = isSeasonal(product);
  const productClass = classifyProduct(product);
  const params = baselineReorderParams(product, month);
  const seasonalIndex = getSeasonalIndexForMonth(month);

  const rop = seasonal
    ? calculateSeasonalROP({
        annualBaseDemand: params.avgDailyUsage * 365,
        seasonalIndex,
        leadTime: params.leadTimeDays,
        seasonalSafetyStock: params.safetyStock,
      })
    : calculateNonSeasonalROP({
        avgDailyDemand: params.avgDailyUsage,
        leadTime: params.leadTimeDays,
        safetyStock: params.safetyStock,
      });

  return {
    id: id || `ROZ-${product.id}`,
    productId: product.id,
    productClass,
    reviewCycle: REVIEW_CYCLE_BY_CLASS[productClass],
    seasonal,
    seasonStart: params.seasonStart,
    seasonEnd: params.seasonEnd,
    avgDailyUsage: params.avgDailyUsage,
    leadTimeDays: params.leadTimeDays,
    safetyStock: params.safetyStock,
    rop: Math.round(rop),
  };
}

// Shared "inventory status" row builder — Product Name / ATP / Seasonal /
// live ROP / Days to Expiry / Fulfillment Status — used by both the
// Dashboard and the Report/Analysis stock-alerts panel so the two pages
// never disagree on the same numbers.
export function buildInventoryStatusRows(products, inventory, reorderRules, batches, month = new Date().getMonth()) {
  const seasonalIndex = getSeasonalIndexForMonth(month);

  return products.map((product) => {
    const inv = inventory[product.id] || { qtyOnHand: 0, qtyCommitted: 0 };
    const rule = reorderRules.find((r) => r.productId === product.id);
    const batch = getSoonestExpiringBatch(batches, product.id);

    const rop = product.seasonal
      ? calculateSeasonalROP({
          annualBaseDemand: (rule?.avgDailyUsage ?? 3) * 365,
          seasonalIndex,
          leadTime: rule?.leadTimeDays ?? 14,
          seasonalSafetyStock: rule?.safetyStock ?? 20,
        })
      : calculateNonSeasonalROP({
          avgDailyDemand: rule?.avgDailyUsage ?? 2,
          leadTime: rule?.leadTimeDays ?? 10,
          safetyStock: rule?.safetyStock ?? 8,
        });

    const row = {
      productId: product.id,
      name: product.name,
      seasonal: product.seasonal,
      qtyOnHand: inv.qtyOnHand,
      qtyCommitted: inv.qtyCommitted,
      rop: Math.round(rop),
      daysToExpiry: batch ? daysUntilExpiry(batch.expiryDate) : null,
    };

    return { ...row, atp: calculateATP(row), status: fulfillmentStatus(row) };
  });
}
