import { CartItem, LoyaltyRuleConfig, LoyaltyTier, CurrencyCode } from '../types';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  PKR: 'Rs. ',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
  SAR: 'SAR ',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  CNY: '¥',
};

export class VelcoraPricingEngine {
  public static formatCurrency(amount: number, currency: CurrencyCode | string = 'USD'): string {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    const num = isNaN(amount) ? 0 : amount;
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  public static calculateLineItem(
    unitPrice: number,
    quantity: number,
    discountAmount: number = 0,
    taxRate: number = 0,
    isTaxInclusive: boolean = false
  ): { lineNet: number; lineDiscount: number; lineTax: number; lineGross: number } {
    const rawTotal = unitPrice * quantity;
    const effectiveTotal = Math.max(0, rawTotal - discountAmount);

    let lineTax = 0;
    let lineNet = 0;
    let lineGross = 0;

    if (isTaxInclusive) {
      lineGross = effectiveTotal;
      lineNet = effectiveTotal / (1 + taxRate);
      lineTax = lineGross - lineNet;
    } else {
      lineNet = effectiveTotal;
      lineTax = effectiveTotal * taxRate;
      lineGross = lineNet + lineTax;
    }

    return {
      lineNet: Number(lineNet.toFixed(2)),
      lineDiscount: Number(discountAmount.toFixed(2)),
      lineTax: Number(lineTax.toFixed(2)),
      lineGross: Number(lineGross.toFixed(2)),
    };
  }

  public static evaluateCart(
    items: CartItem[],
    globalDiscountAmount: number = 0,
    loyaltyRedemptionPoints: number = 0,
    loyaltyConfig?: LoyaltyRuleConfig
  ): {
    subtotal: number;
    totalTax: number;
    totalDiscount: number;
    loyaltyDiscount: number;
    costTotal: number;
    grandTotal: number;
  } {
    let subtotal = 0;
    let totalTax = 0;
    let itemDiscountSum = 0;
    let costTotal = 0;

    for (const item of (items || [])) {
      const calc = this.calculateLineItem(
        item.unitPrice || 0,
        item.quantity || 0,
        item.discount || 0,
        item.taxRate || 0,
        false
      );
      subtotal += (item.unitPrice || 0) * (item.quantity || 0);
      itemDiscountSum += calc.lineDiscount;
      totalTax += calc.lineTax;
      costTotal += (item.costPrice || 0) * (item.quantity || 0);
    }

    let loyaltyDiscount = 0;
    if (loyaltyConfig && loyaltyConfig.enabled && loyaltyRedemptionPoints > 0) {
      if (loyaltyRedemptionPoints >= loyaltyConfig.minPointsForRedemption) {
        loyaltyDiscount = loyaltyRedemptionPoints * loyaltyConfig.pointRedemptionValue;
      }
    }

    const totalDiscount = itemDiscountSum + globalDiscountAmount + loyaltyDiscount;
    const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      loyaltyDiscount: Number(loyaltyDiscount.toFixed(2)),
      costTotal: Number(costTotal.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  }
}

export class VelcoraLoyaltyEngine {
  public static calculatePointsEarned(
    spendAmount: number,
    items: CartItem[] = [],
    config: LoyaltyRuleConfig,
    tierName?: string
  ): number {
    if (!config || !config.enabled) return 0;

    let basePoints = 0;
    if (config.earningModel === 'flat_per_order') {
      basePoints = config.flatPointsPerOrder || 0;
    } else {
      const unit = config.spendAmountUnit > 0 ? config.spendAmountUnit : 10;
      const rate = config.pointsPerSpendUnit > 0 ? config.pointsPerSpendUnit : 1;
      basePoints = Math.floor(Math.max(0, spendAmount) / unit) * rate;
    }

    let multiplier = 1.0;
    if (tierName && config.tiers && config.tiers.length > 0) {
      const foundTier = config.tiers.find(t => t.name.toLowerCase() === tierName.toLowerCase());
      if (foundTier && foundTier.pointsMultiplier > 0) {
        multiplier = foundTier.pointsMultiplier;
      }
    }

    return Math.floor(basePoints * multiplier);
  }

  public static evaluatePointRedemption(
    points: number,
    orderTotal: number,
    config: LoyaltyRuleConfig
  ): { valid: boolean; discountAmount: number; error?: string } {
    if (!config || !config.enabled) {
      return { valid: false, discountAmount: 0, error: 'Loyalty program is disabled.' };
    }
    if (points < (config.minPointsForRedemption || 1)) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Minimum ${config.minPointsForRedemption} points required for redemption.`,
      };
    }

    const valuePerPoint = config.pointRedemptionValue || 0.05;
    const rawDiscount = points * valuePerPoint;
    const maxDiscountAllowed = (orderTotal * (config.maxRedemptionPercentagePerOrder || 50)) / 100;
    const effectiveDiscount = Math.min(rawDiscount, maxDiscountAllowed, orderTotal);

    return {
      valid: true,
      discountAmount: Number(effectiveDiscount.toFixed(2)),
    };
  }

  public static determineTier(lifetimeSpend: number, config: LoyaltyRuleConfig): LoyaltyTier {
    const defaultTier: LoyaltyTier = {
      id: 'tier-default',
      name: 'Bronze',
      minSpendRequirement: 0,
      pointsMultiplier: 1.0,
      badgeColor: '#CD7F32',
    };

    if (!config || !config.tiers || config.tiers.length === 0) {
      return defaultTier;
    }

    const sorted = [...config.tiers].sort((a, b) => b.minSpendRequirement - a.minSpendRequirement);
    for (const t of sorted) {
      if (lifetimeSpend >= t.minSpendRequirement) {
        return t;
      }
    }

    return config.tiers[0] || defaultTier;
  }
}
