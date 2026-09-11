import { BusinessHealthEvaluation, Product, SaleTransaction, Expense, OtherIncome, Customer, Supplier } from '../types';

export interface BusinessAnalyticsInput {
  products: Product[];
  sales: SaleTransaction[];
  expenses: Expense[];
  otherIncomes: OtherIncome[];
  customers: Customer[];
  suppliers: Supplier[];
}

export class VelcoraBusinessBrainEngine {
  public static computeDiagnostics(input: BusinessAnalyticsInput): {
    metrics: {
      totalRevenue: number;
      totalCOGS: number;
      cogs: number;
      grossProfit: number;
      netProfit: number;
      profitMargin: number;
      netProfitMargin: number;
      totalExpenses: number;
      totalOtherIncome: number;
      totalTransactions: number;
      avgOrderValue: number;
      totalInventoryValuation: number;
      deadStockValuation: number;
      lowStockCount: number;
      lowStockItemsCount: number;
      returningCustomerRate: number;
      outstandingReceivables: number;
      outstandingPayables: number;
    };
    health: BusinessHealthEvaluation;
  } {
    const { products, sales, expenses, otherIncomes, customers, suppliers } = input;

    const completedSales = sales.filter(s => s.status !== 'cancelled');
    const hasProducts = products.length > 0;
    const hasSales = completedSales.length > 0;
    const hasExpenses = expenses.length > 0;
    const hasCustomers = customers.length > 0;
    const hasData = hasProducts || hasSales || hasExpenses;

    // 1. Sales & Revenue Math
    const totalRevenue = completedSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalCOGS = completedSales.reduce((sum, s) => {
      if (typeof s.costTotal === 'number') return sum + s.costTotal;
      // Calculate from item cost prices
      const itemsCost = (s.items || []).reduce((iSum, item) => {
        const prod = products.find(p => p.id === item.productId);
        const itemCost = typeof item.costPrice === 'number' ? item.costPrice : (typeof prod?.costPrice === 'number' ? prod.costPrice : 0);
        return iSum + (itemCost * item.quantity);
      }, 0);
      return sum + itemsCost;
    }, 0);
    const grossProfit = totalRevenue - totalCOGS;

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalOtherIncome = otherIncomes.reduce((sum, oi) => sum + oi.amount, 0);
    const netProfit = grossProfit - totalExpenses + totalOtherIncome;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const totalTransactions = completedSales.length;
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // 2. Inventory Math
    let totalInventoryValuation = 0;
    let deadStockValuation = 0;
    let lowStockCount = 0;

    const soldProductIds = new Set(completedSales.flatMap(s => (s.items || []).map(i => i.productId)));

    products.forEach(p => {
      const val = (p.stock || 0) * (p.costPrice || 0);
      totalInventoryValuation += val;
      if (p.stock <= p.minStock) {
        lowStockCount++;
      }
      // Dead stock: has positive stock, but zero recorded sales
      if (p.stock > 0 && !soldProductIds.has(p.id)) {
        deadStockValuation += val;
      }
    });

    // 3. Customer Retention & Receivables Math
    const totalCustCount = customers.length;
    const returningCustCount = customers.filter(c => (c.ordersCount || 0) > 1).length;
    const returningCustomerRate = totalCustCount > 0 ? (returningCustCount / totalCustCount) * 100 : 0;
    const outstandingReceivables = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
    const outstandingPayables = suppliers.reduce((sum, s) => sum + (s.balanceOwed || 0), 0);

    // If there is no real activity recorded at all, return explicit NO_DATA state
    if (!hasData) {
      return {
        metrics: {
          totalRevenue: 0,
          totalCOGS: 0,
          cogs: 0,
          grossProfit: 0,
          netProfit: 0,
          profitMargin: 0,
          netProfitMargin: 0,
          totalExpenses: 0,
          totalOtherIncome: 0,
          totalTransactions: 0,
          avgOrderValue: 0,
          totalInventoryValuation: 0,
          deadStockValuation: 0,
          lowStockCount: 0,
          lowStockItemsCount: 0,
          returningCustomerRate: 0,
          outstandingReceivables: 0,
          outstandingPayables: 0,
        },
        health: {
          hasData: false,
          overallScore: null,
          breakdown: {
            salesHealth: 'NO_DATA',
            profitHealth: 'NO_DATA',
            inventoryHealth: 'NO_DATA',
            expenseHealth: 'NO_DATA',
            customerRetention: 'NO_DATA',
          },
          problems: [],
          opportunities: [],
        },
      };
    }

    // 4. Categorical Health Breakdown calculated strictly from real data
    let salesHealth: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA' = 'NO_DATA';
    if (hasSales) {
      if (totalRevenue >= 15000) salesHealth = 'EXCELLENT';
      else if (totalRevenue >= 2500) salesHealth = 'GOOD';
      else if (totalRevenue >= 500) salesHealth = 'WARNING';
      else salesHealth = 'POOR';
    }

    let profitHealth: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA' = 'NO_DATA';
    if (hasSales || hasExpenses) {
      if (netProfit < 0) profitHealth = 'POOR';
      else if (profitMargin < 12) profitHealth = 'WARNING';
      else if (profitMargin > 30) profitHealth = 'EXCELLENT';
      else profitHealth = 'GOOD';
    }

    let inventoryHealth: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA' = 'NO_DATA';
    if (hasProducts) {
      const deadRatio = totalInventoryValuation > 0 ? (deadStockValuation / totalInventoryValuation) * 100 : 0;
      if (lowStockCount > 5 || deadRatio > 35) inventoryHealth = 'POOR';
      else if (lowStockCount > 0 || deadRatio > 20) inventoryHealth = 'WARNING';
      else if (deadRatio < 10 && lowStockCount === 0) inventoryHealth = 'EXCELLENT';
      else inventoryHealth = 'GOOD';
    }

    let expenseHealth: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA' = 'NO_DATA';
    if (hasExpenses || hasSales) {
      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 100;
      if (expenseRatio > 60) expenseHealth = 'POOR';
      else if (expenseRatio > 35) expenseHealth = 'WARNING';
      else if (expenseRatio < 20 && totalRevenue > 0) expenseHealth = 'EXCELLENT';
      else expenseHealth = 'GOOD';
    }

    let customerRetention: 'POOR' | 'WARNING' | 'GOOD' | 'EXCELLENT' | 'NO_DATA' = 'NO_DATA';
    if (hasCustomers) {
      if (returningCustomerRate >= 40) customerRetention = 'EXCELLENT';
      else if (returningCustomerRate >= 20) customerRetention = 'GOOD';
      else if (returningCustomerRate < 10 && totalCustCount > 3) customerRetention = 'WARNING';
      else customerRetention = 'GOOD';
    }

    // 5. Problems & Action Vectors (Strictly generated from real observed anomalies)
    const problems: BusinessHealthEvaluation['problems'] = [];

    if (netProfit < 0 && (hasSales || hasExpenses)) {
      problems.push({
        id: 'prob-negative-profit',
        title: 'Operating at Net Loss',
        severity: 'CRITICAL',
        what: `Current net loss is -$${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })} across real sales and operating expenses.`,
        why: `Total expenses ($${totalExpenses.toLocaleString()}) exceed gross profit ($${grossProfit.toLocaleString()}).`,
        impact: 'Operating cash reserve depletion and negative working capital pressure.',
        actionRecommendation: 'Audit non-essential expenses in the Expenses module and review product markup pricing.',
      });
    } else if (profitMargin > 0 && profitMargin < 12 && totalRevenue > 0) {
      problems.push({
        id: 'prob-margin-comp',
        title: 'Net Profit Margin Compression',
        severity: 'WARNING',
        what: `Current net profit margin is ${profitMargin.toFixed(1)}%, which is below recommended retail benchmarks.`,
        why: `Operating expenses ($${totalExpenses.toLocaleString()}) and product costs take ${(100 - profitMargin).toFixed(1)}% of realized revenue.`,
        impact: 'Reduced operating cash reserve, slowing reinvestment into high-margin inventory.',
        actionRecommendation: 'Review top overhead expenses, adjust non-competitive markups, and limit cashier discounts.',
      });
    }

    if (lowStockCount > 0) {
      problems.push({
        id: 'prob-low-stock',
        title: `${lowStockCount} Product${lowStockCount > 1 ? 's' : ''} at Low Stock / Reorder Point`,
        severity: lowStockCount > 3 ? 'CRITICAL' : 'WARNING',
        what: `${lowStockCount} active item${lowStockCount > 1 ? 's' : ''} in your inventory catalog have reached or breached safe minimum stock thresholds.`,
        why: 'Recorded sales volume has depleted inventory faster than supplier replenishment.',
        impact: 'Potential lost revenue and stockout during customer checkout.',
        actionRecommendation: 'Generate a Purchase Order in the Purchasing module to replenish low-stock items.',
      });
    }

    if (deadStockValuation > 0 && totalInventoryValuation > 0 && (deadStockValuation / totalInventoryValuation) > 0.15) {
      problems.push({
        id: 'prob-dead-stock',
        title: 'Capital Locked in Slow-Moving Inventory',
        severity: 'WARNING',
        what: `$${deadStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })} worth of inventory has not recorded any customer sales yet.`,
        why: 'Items in catalog with positive stock have zero sales velocity.',
        impact: 'Tied up working capital and warehouse shelf space.',
        actionRecommendation: 'Deploy promotional discount bundles on POS or feature items on storefront.',
      });
    }

    if (outstandingReceivables > 0 && totalRevenue > 0 && (outstandingReceivables / totalRevenue) > 0.2) {
      problems.push({
        id: 'prob-receivables',
        title: 'Elevated Customer Credit Receivables',
        severity: 'WARNING',
        what: `$${outstandingReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })} in customer credit balance is outstanding.`,
        why: 'Unsettled credit orders awaiting payment collection.',
        impact: 'Reduced cash in hand while supplier balances and operating costs remain due.',
        actionRecommendation: 'Review customer credit records and follow up for invoice settlements.',
      });
    }

    // 6. Growth Opportunities (Derived strictly from real positive metrics)
    const opportunities: BusinessHealthEvaluation['opportunities'] = [];

    if (returningCustomerRate >= 25 && totalCustCount >= 3) {
      opportunities.push({
        id: 'opp-loyalty',
        title: 'High Customer Loyalty Resonance',
        potentialBenefit: `Capitalize on ${returningCustomerRate.toFixed(0)}% repeat customer rate to expand customer lifetime value.`,
        confidenceScore: 0.92,
        recommendedAction: 'Activate VIP Loyalty rewards and automated SMS/email specials for repeat buyers.',
      });
    }

    if (totalRevenue >= 2500) {
      opportunities.push({
        id: 'opp-expansion',
        title: 'Strong Sales Momentum',
        potentialBenefit: `Realized revenue of $${totalRevenue.toLocaleString()} demonstrates active customer demand.`,
        confidenceScore: 0.88,
        recommendedAction: 'Expand top-selling product variants and maintain healthy replenishment cycles.',
      });
    }

    if (avgOrderValue > 0) {
      opportunities.push({
        id: 'opp-cross-sell',
        title: 'POS Cross-Selling & Upselling',
        potentialBenefit: `Boost Average Ticket from $${avgOrderValue.toFixed(2)} to $${(avgOrderValue * 1.2).toFixed(2)} (+20%).`,
        confidenceScore: 0.85,
        recommendedAction: 'Train cashier staff on pairing fast-moving accessory items during POS checkout.',
      });
    }

    // 7. Overall Health Score Calculation (0-100) strictly from real data
    let score = 100;

    if (profitHealth === 'POOR') score -= 30;
    else if (profitHealth === 'WARNING') score -= 15;

    if (inventoryHealth === 'POOR') score -= 20;
    else if (inventoryHealth === 'WARNING') score -= 10;

    if (expenseHealth === 'POOR') score -= 20;
    else if (expenseHealth === 'WARNING') score -= 10;

    if (customerRetention === 'WARNING') score -= 8;
    if (lowStockCount > 3) score -= 10;
    if (salesHealth === 'POOR') score -= 15;
    else if (salesHealth === 'WARNING') score -= 8;

    score = Math.max(10, Math.min(100, Math.round(score)));

    return {
      metrics: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCOGS: Number(totalCOGS.toFixed(2)),
        cogs: Number(totalCOGS.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        profitMargin: Number(profitMargin.toFixed(1)),
        netProfitMargin: Number(profitMargin.toFixed(1)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        totalOtherIncome: Number(totalOtherIncome.toFixed(2)),
        totalTransactions,
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        totalInventoryValuation: Number(totalInventoryValuation.toFixed(2)),
        deadStockValuation: Number(deadStockValuation.toFixed(2)),
        lowStockCount,
        lowStockItemsCount: lowStockCount,
        returningCustomerRate: Number(returningCustomerRate.toFixed(1)),
        outstandingReceivables: Number(outstandingReceivables.toFixed(2)),
        outstandingPayables: Number(outstandingPayables.toFixed(2)),
      },
      health: {
        hasData: true,
        overallScore: score,
        breakdown: {
          salesHealth,
          profitHealth,
          inventoryHealth,
          expenseHealth,
          customerRetention,
        },
        problems,
        opportunities,
      },
    };
  }

  public static generateDailyBriefing(
    businessName: string,
    metrics: ReturnType<typeof VelcoraBusinessBrainEngine.computeDiagnostics>['metrics'],
    health: BusinessHealthEvaluation
  ): string {
    if (!health.hasData || health.overallScore === null) {
      return `
=== DAILY VELCORA BUSINESS BRIEFING ===
Business: ${businessName}
Health Score: No data available

OPERATIONAL STATUS:
• No sales transactions or inventory stock recorded yet.
• Record sales in POS Register or add items to catalog to enable autonomous diagnostics.
=======================================`.trim();
    }

    const topProblem = health.problems[0];
    const topOpp = health.opportunities[0];

    return `
=== DAILY VELCORA BUSINESS BRIEFING ===
Business: ${businessName}
Health Score: ${health.overallScore}/100 [${health.overallScore >= 80 ? 'EXCELLENT' : health.overallScore >= 65 ? 'GOOD' : 'ATTENTION REQUIRED'}]

KEY FINANCIALS:
• Realized Revenue: $${metrics.totalRevenue.toLocaleString()}
• Net Profit: $${metrics.netProfit.toLocaleString()} (${metrics.profitMargin}% margin)
• Completed Transactions: ${metrics.totalTransactions} (Avg Ticket: $${metrics.avgOrderValue.toFixed(2)})
• Inventory Valuation: $${metrics.totalInventoryValuation.toLocaleString()} (${metrics.lowStockCount} items low stock)

IMPORTANT WARNING:
${topProblem ? `⚠️ ${topProblem.title}: ${topProblem.what} -> ACTION: ${topProblem.actionRecommendation}` : '✅ No critical anomalies detected in operations.'}

TOP OPPORTUNITY:
${topOpp ? `💡 ${topOpp.title} (${Math.round(topOpp.confidenceScore * 100)}% confidence): ${topOpp.recommendedAction}` : '• Maintain stable baseline sales velocity.'}
=======================================`.trim();
  }
}
