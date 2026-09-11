import { Product, CartItem, SaleTransaction, PaymentBreakdown } from '../types';
import { recordAuditLog } from './staffAuth';

// In-memory atomic stock tracker
interface ProductStockState {
  productId: string;
  name: string;
  stock: number;
  reserved: number;
  version: number;
}

const inventoryMap = new Map<string, ProductStockState>();

// Strict FIFO Mutex Lock Queue to guarantee race-condition-free concurrent checkouts
const lockQueues = new Map<string, Promise<void>>();

async function acquireLock(lockKey: string): Promise<() => void> {
  const previousLock = lockQueues.get(lockKey) || Promise.resolve();
  let release: () => void;
  const currentLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  lockQueues.set(lockKey, previousLock.then(() => currentLock));
  await previousLock;

  return () => {
    release!();
    if (lockQueues.get(lockKey) === currentLock) {
      lockQueues.delete(lockKey);
    }
  };
}

// Seed initial stock levels for fast atomic lock checking
export function syncInventoryState(products: Product[]) {
  for (const p of products) {
    const existing = inventoryMap.get(p.id);
    if (!existing) {
      inventoryMap.set(p.id, {
        productId: p.id,
        name: p.name,
        stock: p.stock,
        reserved: 0,
        version: 1,
      });
    } else {
      // Update stock level from authoritative master while preserving reservation integrity
      existing.stock = p.stock;
      existing.name = p.name;
    }
  }
}

export interface AtomicCheckoutRequest {
  businessId: string;
  staffId: string;
  staffName: string;
  roleId: string;
  deviceId: string;
  deviceName: string;
  cart: CartItem[];
  payments: PaymentBreakdown[];
  notes?: string;
  customerId?: string;
  customerName?: string;
}

export interface AtomicCheckoutResult {
  success: boolean;
  sale?: SaleTransaction;
  conflictItem?: {
    productId: string;
    productName: string;
    availableStock: number;
    requestedQty: number;
  };
  error?: string;
  code?: 'OUT_OF_STOCK' | 'CONCURRENCY_CONFLICT' | 'INVALID_CART';
}

/**
 * Execute atomic concurrency-safe checkout
 * Prevents double-selling across all connected terminals by acquiring mutex locks,
 * verifying real-time stock balances, decrementing atomically, and committing the sale.
 */
export async function executeAtomicCheckout(
  req: AtomicCheckoutRequest
): Promise<AtomicCheckoutResult> {
  const { businessId, staffId, staffName, roleId, deviceId, deviceName, cart, payments, notes, customerId, customerName } = req;

  if (!cart || cart.length === 0) {
    return {
      success: false,
      error: 'Cannot process checkout with an empty cart.',
      code: 'INVALID_CART',
    };
  }

  // 1. Lock all product IDs in cart in deterministic alphabetical order to avoid deadlocks
  const productIds = Array.from(new Set(cart.map(item => item.productId))).sort();
  const releaseFunctions: (() => void)[] = [];

  try {
    for (const pid of productIds) {
      const lockKey = `${businessId}:${pid}`;
      const releaseLock = await acquireLock(lockKey);
      releaseFunctions.push(releaseLock);
    }

    // 2. Validate stock availability for each item in the cart
    for (const item of cart) {
      const state = inventoryMap.get(item.productId);
      if (state) {
        const available = state.stock - state.reserved;
        if (available < item.quantity) {
          // Log concurrency conflict
          recordAuditLog(businessId, {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            businessId,
            staffId,
            staffName,
            roleId,
            action: 'CONCURRENCY_LOCK_RESOLVED',
            timestamp: new Date().toISOString(),
            deviceId,
            deviceName,
            details: `Prevented oversell on '${item.name}' (Terminal requested ${item.quantity} units, available stock was ${available})`,
            severity: 'warning',
          });

          return {
            success: false,
            code: 'OUT_OF_STOCK',
            conflictItem: {
              productId: item.productId,
              productName: item.name,
              availableStock: Math.max(0, available),
              requestedQty: item.quantity,
            },
            error: `Insufficient stock for '${item.name}'. Available in store: ${Math.max(0, available)}, Requested: ${item.quantity}. The inventory was updated by another terminal.`,
          };
        }
      }
    }

    // 3. Atomically decrement stock
    for (const item of cart) {
      const state = inventoryMap.get(item.productId);
      if (state) {
        state.stock = Math.max(0, state.stock - item.quantity);
        state.version++;
      }
    }

    // 4. Compute totals
    const subtotal = cart.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    const discountTotal = cart.reduce((acc, it) => acc + (it.discount || 0), 0);
    const taxTotal = cart.reduce((acc, it) => acc + (it.taxAmount || 0), 0);
    const grandTotal = subtotal - discountTotal + taxTotal;
    const costTotal = cart.reduce((acc, it) => acc + ((it.costPrice || 0) * it.quantity), 0);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    const sale: SaleTransaction = {
      id: `sale-tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      businessId,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: customerId || undefined,
      customerName: customerName || 'Walk-in Customer',
      items: [...cart],
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      costTotal,
      netProfit: grandTotal - costTotal - taxTotal,
      payments: [...payments],
      balanceRemaining: Math.max(0, grandTotal - totalPaid),
      status: 'completed',
      pointsEarned: Math.floor(grandTotal / 10),
      pointsRedeemed: 0,
      notes: notes || undefined,
      cashierName: `${staffName} (${staffId})`,
      createdAt: new Date().toISOString(),
      channel: 'pos',
      syncStatus: 'synced',
      isOffline: false,
    };

    // 5. Record Audit Log for Sale Completion
    recordAuditLog(businessId, {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      businessId,
      staffId,
      staffName,
      roleId,
      action: 'SALE_COMPLETED',
      timestamp: new Date().toISOString(),
      deviceId,
      deviceName,
      details: `Completed sale #${sale.invoiceNumber} for $${grandTotal.toFixed(2)} (${cart.length} line items) tender: ${payments.map(p => `${p.method}: $${p.amount}`).join(', ')}`,
      metadata: { invoiceNumber: sale.invoiceNumber, grandTotal, itemsCount: cart.length },
      severity: 'info',
    });

    return {
      success: true,
      sale,
    };
  } finally {
    // Always release all acquired mutexes in reverse order
    while (releaseFunctions.length > 0) {
      const releaseFn = releaseFunctions.pop();
      if (releaseFn) releaseFn();
    }
  }
}

/**
 * Adjust stock atomically
 */
export function adjustProductStockAtomically(
  businessId: string,
  productId: string,
  deltaOrName: number | string,
  reasonOrDelta?: string | number,
  staffId?: string,
  staffName?: string,
  roleId?: string,
  deviceId?: string,
  deviceName?: string,
  reasonParam?: string
): { success: boolean; newStock: number; error?: string } {
  let productName = 'Product';
  let delta = 0;
  let reason = 'Manual stock adjustment';

  if (typeof deltaOrName === 'number') {
    delta = deltaOrName;
    reason = typeof reasonOrDelta === 'string' ? reasonOrDelta : 'Manual adjustment';
  } else {
    productName = deltaOrName;
    delta = typeof reasonOrDelta === 'number' ? reasonOrDelta : 0;
    reason = reasonParam || 'Manual adjustment';
  }

  let state = inventoryMap.get(productId);
  if (!state) {
    state = {
      productId,
      name: productName,
      stock: 0,
      reserved: 0,
      version: 1,
    };
    inventoryMap.set(productId, state);
  }

  // Underflow guard: Prevent negative stock below 0
  if (state.stock + delta < 0) {
    return {
      success: false,
      newStock: state.stock,
      error: `Cannot decrease stock below zero (current: ${state.stock}, requested delta: ${delta})`,
    };
  }

  const oldStock = state.stock;
  state.stock = Math.max(0, state.stock + delta);
  state.version++;

  recordAuditLog(businessId, {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    businessId,
    staffId: staffId || 'STF-001',
    staffName: staffName || 'Cashier',
    roleId: roleId || 'role-cashier',
    action: 'STOCK_ADJUSTED',
    timestamp: new Date().toISOString(),
    deviceId: deviceId || 'dev-pos-01',
    deviceName: deviceName || 'POS Terminal 1',
    details: `${delta >= 0 ? 'Increased' : 'Decreased'} stock for '${productName}' from ${oldStock} to ${state.stock} (${delta >= 0 ? '+' : ''}${delta} units). Reason: ${reason}`,
    metadata: { productId, delta, oldStock, newStock: state.stock, reason },
    severity: 'info',
  });

  return { success: true, newStock: state.stock };
}
