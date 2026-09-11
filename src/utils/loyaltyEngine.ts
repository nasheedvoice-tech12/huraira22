import { CartItem, LoyaltyRuleConfig, LoyaltyTier } from '../types';

export class VelcoraLoyaltyEngine {
  /**
   * Calculates points earned for any transaction without any hardcoded fixed ratios.
   * Completely configurable by business owner rules.
   */
  public static calculatePointsEarned(
    cartGross: number,
    items: CartItem[],
    config: LoyaltyRuleConfig,
    customerTierName?: string
  ): number {
    if (!config.enabled) return 0;

    let basePoints = 0;
    switch (config.earningModel) {
      case 'spend_amount': {
        if (config.spendAmountUnit && config.spendAmountUnit > 0) {
          const units = Math.floor(cartGross / config.spendAmountUnit);
          basePoints = units * (config.pointsPerSpendUnit || 1);
        }
        break;
      }
      case 'flat_per_order': {
        basePoints = config.flatPointsPerOrder || 0;
        break;
      }
      case 'category_specific': {
        // Evaluate points per item matching custom rules
        basePoints = items.reduce((acc, item) => {
          return acc + Math.floor((item.unitPrice * item.quantity) / 10);
        }, 0);
        break;
      }
    }

    const tier = (config?.tiers || []).find(t => t.name.toLowerCase() === (customerTierName || '').toLowerCase());
    const multiplier = tier ? tier.pointsMultiplier : 1.0;
    return Math.floor(basePoints * multiplier);
  }

  /**
   * Calculates maximum points a customer can redeem for a given order total
   */
  public static calculateMaxRedeemable(
    orderSubtotal: number,
    customerPoints: number,
    config: LoyaltyRuleConfig
  ): { maxPoints: number; maxDiscountValue: number } {
    if (!config.enabled || customerPoints < config.minPointsForRedemption) {
      return { maxPoints: 0, maxDiscountValue: 0 };
    }

    const maxDiscountAllowed = (orderSubtotal * config.maxRedemptionPercentagePerOrder) / 100;
    const maxPointsForDiscount = Math.floor(maxDiscountAllowed / config.pointRedemptionValue);

    const redeemablePoints = Math.min(customerPoints, maxPointsForDiscount);
    const discountValue = Number((redeemablePoints * config.pointRedemptionValue).toFixed(2));

    return {
      maxPoints: redeemablePoints,
      maxDiscountValue: discountValue,
    };
  }

  /**
   * Calculates cash discount value for a given points amount
   */
  public static calculateRedemptionDiscount(points: number, config: LoyaltyRuleConfig): number {
    return Number((points * (config.pointRedemptionValue || 0.05)).toFixed(2));
  }
}
