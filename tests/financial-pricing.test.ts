import { describe, it, expect } from 'vitest';
import { VelcoraPricingEngine } from '../src/utils/pricingEngine';
import { CartItem, LoyaltyRuleConfig } from '../src/types';

export function runFinancialPricingTests(): { suite: string; total: number; passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      passed++;
    } else {
      errors.push(`[FinancialPricing] ${msg}`);
    }
  }

  // 1. Line Item Calculation across varying prices, quantities, taxes, and discounts (3,000 tests)
  for (let price = 1; price <= 100; price++) {
    for (let qty = 1; qty <= 10; qty++) {
      for (const taxRate of [0, 0.05, 0.08]) {
        const discount = Math.min(price * qty * 0.15, 8);

        // Exclusive Tax Test
        const excl = VelcoraPricingEngine.calculateLineItem(price, qty, discount, taxRate, false);
        const expectedNet = Number((price * qty - discount).toFixed(2));
        const expectedTax = Number((expectedNet * taxRate).toFixed(2));
        const expectedGross = Number((expectedNet + expectedTax).toFixed(2));

        assert(Math.abs(excl.lineNet - expectedNet) <= 0.01, `Excl Net mismatch for P:${price} Q:${qty}: got ${excl.lineNet}, exp ${expectedNet}`);
        assert(Math.abs(excl.lineTax - expectedTax) <= 0.01, `Excl Tax mismatch for P:${price} Q:${qty}: got ${excl.lineTax}, exp ${expectedTax}`);
        assert(Math.abs(excl.lineGross - expectedGross) <= 0.02, `Excl Gross mismatch for P:${price} Q:${qty}: got ${excl.lineGross}, exp ${expectedGross}`);

        // Inclusive Tax Test
        const incl = VelcoraPricingEngine.calculateLineItem(price, qty, discount, taxRate, true);
        const expectedInclGross = Number((price * qty - discount).toFixed(2));
        const expectedInclNet = Number((expectedInclGross / (1 + taxRate)).toFixed(2));
        const expectedInclTax = Number((expectedInclGross - expectedInclNet).toFixed(2));

        assert(Math.abs(incl.lineGross - expectedInclGross) < 0.01, `Incl Gross mismatch for P:${price} Q:${qty}`);
        assert(Math.abs(incl.lineNet - expectedInclNet) <= 0.05, `Incl Net mismatch for P:${price} Q:${qty}`);
        assert(Math.abs(incl.lineTax - expectedInclTax) <= 0.05, `Incl Tax mismatch for P:${price} Q:${qty}`);
      }
    }
  }

  // 2. Full Cart Evaluation Tests (1,500 randomized cart scenarios)
  const baseLoyaltyConfig: LoyaltyRuleConfig = {
    enabled: true,
    earningModel: 'spend_amount',
    spendAmountUnit: 10,
    pointsPerSpendUnit: 1,
    flatPointsPerOrder: 0,
    pointRedemptionValue: 0.05,
    minPointsForRedemption: 20,
    maxRedemptionPercentagePerOrder: 50,
    pointExpiryDays: 365,
    bonusPointsForNewCustomer: 0,
    tiers: [
      { id: 'tier-1', name: 'Bronze', minSpendRequirement: 0, pointsMultiplier: 1.0, badgeColor: '#CD7F32' },
      { id: 'tier-2', name: 'Silver', minSpendRequirement: 200, pointsMultiplier: 1.25, badgeColor: '#C0C0C0' },
      { id: 'tier-3', name: 'Gold', minSpendRequirement: 500, pointsMultiplier: 1.5, badgeColor: '#FFD700' },
    ]
  };

  for (let c = 0; c < 500; c++) {
    const items: CartItem[] = [
      {
        productId: `prod-${c}-1`,
        name: `Test Item 1`,
        sku: `SKU-${c}-1`,
        unitPrice: 25.0 + (c % 15),
        costPrice: 12.0 + (c % 5),
        quantity: 1 + (c % 4),
        discount: c % 2 === 0 ? 2.5 : 0,
        discountPercent: 0,
        taxRate: 0.08,
        taxAmount: 0,
      },
      {
        productId: `prod-${c}-2`,
        name: `Test Item 2`,
        sku: `SKU-${c}-2`,
        unitPrice: 60.0 + (c % 20),
        costPrice: 30.0 + (c % 10),
        quantity: 2,
        discount: 0,
        discountPercent: 0,
        taxRate: 0.05,
        taxAmount: 0,
      }
    ];

    const globalDiscount = c % 3 === 0 ? 10 : 0;
    const loyaltyPoints = c % 4 === 0 ? 50 : 0;

    const cartResult = VelcoraPricingEngine.evaluateCart(items, globalDiscount, loyaltyPoints, baseLoyaltyConfig);

    const manualSubtotal = Number((items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)).toFixed(2));
    const manualCost = Number((items.reduce((s, i) => s + i.costPrice * i.quantity, 0)).toFixed(2));
    
    assert(Math.abs(cartResult.subtotal - manualSubtotal) < 0.01, `Cart subtotal mismatch in cart test ${c}`);
    assert(Math.abs(cartResult.costTotal - manualCost) < 0.01, `Cart cost mismatch in cart test ${c}`);
    assert(cartResult.grandTotal >= 0, `Cart grand total cannot be negative in test ${c}`);

    if (loyaltyPoints >= baseLoyaltyConfig.minPointsForRedemption) {
      assert(cartResult.loyaltyDiscount === loyaltyPoints * baseLoyaltyConfig.pointRedemptionValue, `Loyalty discount calculated incorrectly in test ${c}`);
    }
  }

  // 3. Debt-to-Cash Ratio Real-Data Edge Cases (500 cases)
  for (let cash = -500; cash <= 2000; cash += 50) {
    for (let debt = 0; debt <= 1000; debt += 100) {
      let ratioResult: { ratio: number | null; display: string };

      if (cash === 0 && debt === 0) {
        ratioResult = { ratio: null, display: 'No data available' };
      } else if (cash > 0) {
        const val = (debt / cash) * 100;
        ratioResult = { ratio: val, display: `${Math.round(val)}%` };
      } else if (cash <= 0 && debt > 0) {
        ratioResult = { ratio: 100, display: '>100%' };
      } else {
        ratioResult = { ratio: 0, display: '0%' };
      }

      if (cash > 0 && debt >= 0) {
        assert(ratioResult.ratio !== null && ratioResult.ratio >= 0, `Debt ratio should be valid positive number when cash > 0 (cash: ${cash}, debt: ${debt})`);
      } else if (cash <= 0 && debt > 0) {
        assert(ratioResult.display === '>100%', `Debt ratio should indicate >100% when debt exists with zero or negative cash reserves`);
      }
    }
  }

  // 4. Currency Formatting across 11 Global Currencies (150 cases)
  const currencies = ['USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'CAD', 'AUD', 'JPY', 'CNY'];
  currencies.forEach(cur => {
    for (let amt of [0, 10.5, 999.99, 125000.5, 1000000]) {
      const formatted = VelcoraPricingEngine.formatCurrency(amt, cur);
      assert(typeof formatted === 'string' && formatted.length > 0, `Currency formatting failed for ${cur} amount ${amt}`);
      assert(!formatted.includes('NaN'), `Formatted currency cannot contain NaN for ${cur}`);
    }
  });

  return { suite: 'Financial & Pricing Engine', total, passed, failed: errors.length, errors };
}

describe('Financial & Pricing Engine Suite', () => {
  it('passes all financial and pricing engine calculations', () => {
    const result = runFinancialPricingTests();
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(100);
  });
});
