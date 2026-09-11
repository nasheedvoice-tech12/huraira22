import { describe, it, expect } from 'vitest';
import { syncInventoryState, executeAtomicCheckout, adjustProductStockAtomically, AtomicCheckoutRequest } from '../src/server/concurrencyEngine';
import { Product, CartItem } from '../src/types';

export async function runInventoryConcurrencyTests(): Promise<{ suite: string; total: number; passed: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      passed++;
    } else {
      errors.push(`[InventoryConcurrency] ${msg}`);
    }
  }

  // 1. Initial State Synchronization (100 products)
  const sampleProducts: Product[] = [];
  for (let i = 1; i <= 100; i++) {
    sampleProducts.push({
      id: `prod-test-${i}`,
      businessId: 'biz-clothing-01',
      name: `Test Apparel Item ${i}`,
      sku: `SKU-TEST-${i}`,
      barcode: `8901000${i}`,
      category: 'Clothing',
      supplierId: 'sup-1',
      purchasePrice: 15,
      costPrice: 15,
      sellingPrice: 40,
      wholesalePrice: 28,
      taxRate: 0.08,
      taxInclusive: false,
      unit: 'Pcs',
      stock: 50, // 50 units initial stock
      minStock: 10,
      maxStock: 200,
      warehouseId: 'wh-1',
      location: 'Aisle 1',
      isService: false,
      enableBatchTracking: false,
      enableSerialTracking: false,
      variants: [],
      status: 'active',
      customFieldValues: {},
      onlineStoreActive: true,
    });
  }

  syncInventoryState(sampleProducts);

  // 2. Sequential atomic checkouts on multiple products (500 checkouts)
  for (let c = 0; c < 500; c++) {
    const prodIdx = (c % 100) + 1;
    const cart: CartItem[] = [
      {
        productId: `prod-test-${prodIdx}`,
        name: `Test Apparel Item ${prodIdx}`,
        sku: `SKU-TEST-${prodIdx}`,
        unitPrice: 40,
        costPrice: 15,
        quantity: 1,
        discount: 0,
        discountPercent: 0,
        taxRate: 0.08,
        taxAmount: 3.2,
      }
    ];

    const req: AtomicCheckoutRequest = {
      businessId: 'biz-clothing-01',
      staffId: 'STF-001',
      staffName: 'Emma Watson',
      roleId: 'role-cashier',
      deviceId: `dev-reg-${(c % 4) + 1}`,
      deviceName: `Register ${(c % 4) + 1}`,
      cart,
      payments: [{ method: 'cash', amount: 43.2, paidAt: new Date().toISOString() }],
    };

    const res = await executeAtomicCheckout(req);
    assert(res.success === true, `Atomic checkout should succeed for test #${c}`);
    assert(!!res.sale && res.sale.grandTotal > 0, `Sale object should be generated in test #${c}`);
  }

  // 3. High-Concurrency Stress Test (Simulating 30 rapid simultaneous checkout attempts on a low-stock item)
  const scarceProduct: Product = {
    id: 'prod-scarce-01',
    businessId: 'biz-clothing-01',
    name: 'Limited Edition Silk Jacket',
    sku: 'SKU-SCARCE-01',
    barcode: '890199999',
    category: 'Clothing',
    supplierId: 'sup-1',
    purchasePrice: 100,
    costPrice: 100,
    sellingPrice: 250,
    wholesalePrice: 180,
    taxRate: 0.08,
    taxInclusive: false,
    unit: 'Pcs',
    stock: 10, // ONLY 10 in stock
    minStock: 2,
    maxStock: 50,
    warehouseId: 'wh-1',
    location: 'VIP Display',
    isService: false,
    enableBatchTracking: false,
    enableSerialTracking: false,
    variants: [],
    status: 'active',
    customFieldValues: {},
    onlineStoreActive: true,
  };

  syncInventoryState([scarceProduct]);

  // Fire 30 concurrent checkout requests for 1 item each
  const concurrentPromises: Promise<any>[] = [];
  for (let r = 0; r < 30; r++) {
    const req: AtomicCheckoutRequest = {
      businessId: 'biz-clothing-01',
      staffId: `STF-${r}`,
      staffName: `Cashier ${r}`,
      roleId: 'role-cashier',
      deviceId: `dev-reg-${r}`,
      deviceName: `Register ${r}`,
      cart: [{
        productId: 'prod-scarce-01',
        name: 'Limited Edition Silk Jacket',
        sku: 'SKU-SCARCE-01',
        unitPrice: 250,
        costPrice: 100,
        quantity: 1,
        discount: 0,
        discountPercent: 0,
        taxRate: 0.08,
        taxAmount: 20,
      }],
      payments: [{ method: 'card', amount: 270, paidAt: new Date().toISOString() }],
    };
    concurrentPromises.push(executeAtomicCheckout(req));
  }

  const concurrentResults = await Promise.all(concurrentPromises);
  const successfulCheckouts = concurrentResults.filter(r => r.success).length;
  const rejectedCheckouts = concurrentResults.filter(r => !r.success).length;

  assert(successfulCheckouts === 10, `Exactly 10 checkouts must succeed because initial stock was 10, got: ${successfulCheckouts}`);
  assert(rejectedCheckouts === 20, `Exactly 20 checkouts must be rejected with OUT_OF_STOCK, got: ${rejectedCheckouts}`);

  // 4. Test direct atomic stock adjustments (1,000 cases)
  for (let a = 1; a <= 500; a++) {
    const adj = await adjustProductStockAtomically('biz-clothing-01', 'prod-test-1', 1, 'Restock delivery', 'STF-001', 'Emma Watson');
    assert(adj.success === true, `Stock adjustment increase must succeed for #${a}`);
  }
  for (let a = 1; a <= 500; a++) {
    const adj = await adjustProductStockAtomically('biz-clothing-01', 'prod-test-1', -1, 'Damage write-off', 'STF-001', 'Emma Watson');
    assert(adj.success === true, `Stock adjustment decrease must succeed for #${a}`);
  }

  // 5. Underflow test: Attempting to decrement stock below 0
  const underflowAdj = await adjustProductStockAtomically('biz-clothing-01', 'prod-scarce-01', -100, 'Invalid audit write-off', 'STF-001', 'Emma');
  assert(underflowAdj.success === false, `Atomic stock decrement that results in negative stock must be prevented`);

  return { suite: 'Inventory & Concurrency Engine', total, passed, failed: errors.length, errors };
}

describe('Inventory & Concurrency Engine Suite', () => {
  it('passes all atomic inventory and concurrency tests', async () => {
    const result = await runInventoryConcurrencyTests();
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(100);
  });
});
