import { describe, it, expect } from 'vitest';
import { VelcoraLoyaltyEngine } from '../src/utils/pricingEngine';
import { LoyaltyRuleConfig, CartItem } from '../src/types';

export function runLoyaltyPromotionsTests(): { suite: string; total: number; passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      passed++;
    } else {
      errors.push(`[LoyaltyPromotions] ${msg}`);
    }
  }

  const baseConfig: LoyaltyRuleConfig = {
    enabled: true,
    earningModel: 'spend_amount',
    spendAmountUnit: 10,
    pointsPerSpendUnit: 2,
    flatPointsPerOrder: 0,
    pointRedemptionValue: 0.05,
    minPointsForRedemption: 20,
    maxRedemptionPercentagePerOrder: 50,
    pointExpiryDays: 365,
    bonusPointsForNewCustomer: 0,
    tiers: [
      { id: 'tier-1', name: 'Bronze', minSpendRequirement: 0, pointsMultiplier: 1.0, badgeColor: '#CD7F32' },
      { id: 'tier-2', name: 'Silver', minSpendRequirement: 250, pointsMultiplier: 1.25, badgeColor: '#C0C0C0' },
      { id: 'tier-3', name: 'Gold', minSpendRequirement: 600, pointsMultiplier: 1.5, badgeColor: '#FFD700' },
      { id: 'tier-4', name: 'Platinum', minSpendRequirement: 1500, pointsMultiplier: 2.0, badgeColor: '#E5E4E2' },
    ]
  };

  const sampleItems: CartItem[] = [
    { productId: 'p1', name: 'Item 1', sku: 'S1', unitPrice: 20, costPrice: 10, quantity: 2, discount: 0, discountPercent: 0, taxRate: 0, taxAmount: 0 },
    { productId: 'p2', name: 'Item 2', sku: 'S2', unitPrice: 50, costPrice: 25, quantity: 1, discount: 0, discountPercent: 0, taxRate: 0, taxAmount: 0 }
  ];

  // 1. Point Earning Model Calculations (400 tests across varying spend totals and tier levels)
  for (let spend = 10; spend <= 1000; spend += 10) {
    for (const tier of ['Bronze', 'Silver', 'Gold', 'Platinum']) {
      const earned = VelcoraLoyaltyEngine.calculatePointsEarned(spend, sampleItems, baseConfig, tier);
      
      const expectedBase = Math.floor(spend / 10) * 2;
      const tierMult = tier === 'Silver' ? 1.25 : tier === 'Gold' ? 1.5 : tier === 'Platinum' ? 2.0 : 1.0;
      const expectedEarned = Math.floor(expectedBase * tierMult);

      assert(earned === expectedEarned, `Point calculation mismatch for spend: ${spend}, tier: ${tier}. Got ${earned}, exp ${expectedEarned}`);
    }
  }

  // 2. Flat per Order Earning Model (100 tests)
  const flatConfig: LoyaltyRuleConfig = {
    ...baseConfig,
    earningModel: 'flat_per_order',
    flatPointsPerOrder: 25,
  };

  for (let spend = 10; spend <= 1000; spend += 10) {
    const earned = VelcoraLoyaltyEngine.calculatePointsEarned(spend, sampleItems, flatConfig);
    assert(earned === 25, `Flat earning model must grant exact pointsPerOrder`);
  }

  // 3. Point Redemption Evaluation (500 tests)
  for (let pts = 0; pts <= 250; pts += 5) {
    for (let grandTotal = 20; grandTotal <= 200; grandTotal += 20) {
      const redeemEval = VelcoraLoyaltyEngine.evaluatePointRedemption(pts, grandTotal, baseConfig);

      if (pts < baseConfig.minPointsForRedemption) {
        assert(redeemEval.valid === false, `Points under minimum threshold (${baseConfig.minPointsForRedemption}) must be rejected`);
      } else {
        assert(redeemEval.valid === true, `Points >= threshold must be valid`);
        const maxDollar = (grandTotal * baseConfig.maxRedemptionPercentagePerOrder) / 100;
        assert(redeemEval.discountAmount <= maxDollar, `Redemption discount cannot exceed max allowed percentage cap`);
      }
    }
  }

  // 4. Loyalty Tier Auto-Determination (200 tests)
  for (let lifetimeSpend = 0; lifetimeSpend <= 2000; lifetimeSpend += 10) {
    const tier = VelcoraLoyaltyEngine.determineTier(lifetimeSpend, baseConfig);
    if (lifetimeSpend >= 1500) {
      assert(tier.name === 'Platinum', `Spend $${lifetimeSpend} should be Platinum`);
    } else if (lifetimeSpend >= 600) {
      assert(tier.name === 'Gold', `Spend $${lifetimeSpend} should be Gold`);
    } else if (lifetimeSpend >= 250) {
      assert(tier.name === 'Silver', `Spend $${lifetimeSpend} should be Silver`);
    } else {
      assert(tier.name === 'Bronze', `Spend $${lifetimeSpend} should be Bronze`);
    }
  }

  return { suite: 'Loyalty & Promotions Engine', total, passed, failed: errors.length, errors };
}

describe('Loyalty & Promotions Engine Suite', () => {
  it('passes all loyalty calculations, tiers, and redemption rules', () => {
    const result = runLoyaltyPromotionsTests();
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(100);
  });
});
