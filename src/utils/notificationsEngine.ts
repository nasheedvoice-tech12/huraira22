import { Product, SaleTransaction, Expense, CustomerCredit, PurchaseOrder, SystemModuleKey } from '../types';
import { VelcoraPricingEngine } from './pricingEngine';
import { VelcoraBusinessBrainEngine } from './brainEngine';

export interface SystemNotification {
  id: string;
  category: 'stock' | 'sale' | 'security' | 'ai';
  title: string;
  message: string;
  time: string;
  timestamp: number;
  isRead: boolean;
  actionModule?: SystemModuleKey;
  actionLabel?: string;
}

function formatRelativeTime(dateStrOrTs: string | number): string {
  const ts = typeof dateStrOrTs === 'string' ? new Date(dateStrOrTs).getTime() : dateStrOrTs;
  if (isNaN(ts)) return 'Recently';

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - ts) / 1000));

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export class VelcoraNotificationsEngine {
  private static READ_STORAGE_KEY = 'velcora_read_notifications_ids';
  private static CLEARED_TS_KEY = 'velcora_cleared_notifications_ts';

  public static getReadIds(): Set<string> {
    try {
      const saved = localStorage.getItem(this.READ_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  public static markAsRead(id: string): void {
    try {
      const readIds = this.getReadIds();
      readIds.add(id);
      localStorage.setItem(this.READ_STORAGE_KEY, JSON.stringify(Array.from(readIds)));
    } catch {}
  }

  public static markAllAsRead(notifIds: string[]): void {
    try {
      const readIds = this.getReadIds();
      notifIds.forEach(id => readIds.add(id));
      localStorage.setItem(this.READ_STORAGE_KEY, JSON.stringify(Array.from(readIds)));
    } catch {}
  }

  public static clearAll(): void {
    try {
      localStorage.setItem(this.CLEARED_TS_KEY, String(Date.now()));
    } catch {}
  }

  public static getClearedTimestamp(): number {
    try {
      const saved = localStorage.getItem(this.CLEARED_TS_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  public static generateRealNotifications(params: {
    products: Product[];
    sales: SaleTransaction[];
    expenses: Expense[];
    customerCredits?: CustomerCredit[];
    purchaseOrders?: PurchaseOrder[];
    brainMetrics?: ReturnType<typeof VelcoraBusinessBrainEngine.computeDiagnostics>['metrics'];
    currency?: string;
  }): SystemNotification[] {
    const {
      products = [],
      sales = [],
      expenses = [],
      customerCredits = [],
      purchaseOrders = [],
      brainMetrics,
      currency = 'USD',
    } = params;

    const readIds = this.getReadIds();
    const clearedTs = this.getClearedTimestamp();
    const notifs: SystemNotification[] = [];

    // 1. REAL LOW STOCK ALERTS (Inventory Events)
    products.forEach(p => {
      const threshold = p.minStock || 5;
      if (p.stock <= threshold) {
        const id = `notif-stock-${p.id}`;
        notifs.push({
          id,
          category: 'stock',
          title: `Low Stock: ${p.name}`,
          message: p.stock === 0
            ? `Out of stock! ${p.name} (SKU: ${p.sku}) has 0 units remaining. Reorder threshold is ${threshold} ${p.unit || 'units'}.`
            : `Only ${p.stock} ${p.unit || 'units'} left for ${p.name} (SKU: ${p.sku}). Safety threshold is ${threshold}.`,
          time: 'Active Alert',
          timestamp: Date.now() - 300000,
          isRead: readIds.has(id),
          actionModule: 'inventory',
          actionLabel: 'Check Inventory',
        });
      }
    });

    // 2. REAL SALES & REVENUE NOTIFICATIONS
    const validSales = sales
      .filter(s => s.status !== 'cancelled')
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    validSales.slice(0, 10).forEach(s => {
      const saleTs = new Date(s.createdAt).getTime() || Date.now();
      const itemCount = (s.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      const isHighValue = s.grandTotal >= 300;
      const id = `notif-sale-${s.id}`;

      const tenderMethods = (s.payments && s.payments.length > 0)
        ? s.payments.map(p => p.method).join(', ')
        : 'Direct POS';

      notifs.push({
        id,
        category: 'sale',
        title: isHighValue ? `High-Value Order: ${s.invoiceNumber}` : `Sale Completed: ${s.invoiceNumber}`,
        message: `${s.customerName || 'Walk-in Customer'} completed an order of ${itemCount} items totaling ${VelcoraPricingEngine.formatCurrency(s.grandTotal, currency)} (${tenderMethods}).`,
        time: formatRelativeTime(saleTs),
        timestamp: saleTs,
        isRead: readIds.has(id),
        actionModule: 'orders',
        actionLabel: 'View Sale',
      });
    });

    // 3. REAL SALE REFUNDS & RETURNS
    sales.forEach(s => {
      if ((s.returnHistory && s.returnHistory.length > 0) || (s.refundedAmount && s.refundedAmount > 0)) {
        const id = `notif-refund-${s.id}`;
        const refundAmt = s.refundedAmount || (s.returnHistory || []).reduce((sum, r) => sum + (r.refundAmount || 0), 0);
        const refTs = new Date(s.createdAt).getTime() || Date.now();
        notifs.push({
          id,
          category: 'sale',
          title: `Return / Refund Processed`,
          message: `Refund of ${VelcoraPricingEngine.formatCurrency(refundAmt, currency)} processed on Invoice #${s.invoiceNumber}.`,
          time: formatRelativeTime(refTs),
          timestamp: refTs,
          isRead: readIds.has(id),
          actionModule: 'orders',
          actionLabel: 'View Invoice',
        });
      }
    });

    // 4. REAL CUSTOMER CREDIT DUE DATES & RECEIVABLES
    customerCredits.forEach(cc => {
      if (cc.remainingBalance > 0) {
        const id = `notif-credit-${cc.id}`;
        notifs.push({
          id,
          category: 'security',
          title: `Credit Receivable Due: ${cc.customerName}`,
          message: `Outstanding customer balance of ${VelcoraPricingEngine.formatCurrency(cc.remainingBalance, currency)} due on ${cc.dueDate || 'due terms'}.`,
          time: cc.dueDate ? `Due ${cc.dueDate}` : 'Pending Due',
          timestamp: Date.now() - 7200000,
          isRead: readIds.has(id),
          actionModule: 'expenses',
          actionLabel: 'Collect Credit',
        });
      }
    });

    // 5. REAL EXPENSE NOTIFICATIONS
    expenses.slice(0, 5).forEach(e => {
      const expTs = new Date(e.date).getTime() || Date.now();
      const id = `notif-exp-${e.id}`;
      notifs.push({
        id,
        category: 'security',
        title: `Operating Expense: ${e.category}`,
        message: `${e.title || e.category} expense of ${VelcoraPricingEngine.formatCurrency(e.amount, currency)} recorded via ${e.paymentMethod || 'Cash'}.`,
        time: formatRelativeTime(expTs),
        timestamp: expTs,
        isRead: readIds.has(id),
        actionModule: 'expenses',
        actionLabel: 'Audit Expense',
      });
    });

    // 6. REAL PURCHASE ORDER DELIVERIES / STATUS
    purchaseOrders.slice(0, 5).forEach(po => {
      const id = `notif-po-${po.id}`;
      const poTs = new Date(po.orderDate || po.expectedDate || Date.now()).getTime();
      notifs.push({
        id,
        category: 'stock',
        title: po.status === 'received' ? `PO Delivered: ${po.poNumber}` : `Purchase Order: ${po.poNumber}`,
        message: `PO #${po.poNumber} for ${po.supplierName} (${po.items?.length || 1} items, total ${VelcoraPricingEngine.formatCurrency(po.totalAmount, currency)}) status is ${po.status}.`,
        time: formatRelativeTime(poTs),
        timestamp: poTs,
        isRead: readIds.has(id),
        actionModule: 'purchases',
        actionLabel: 'View PO',
      });
    });

    // 7. REAL BUSINESS BRAIN / AI DIAGNOSTIC INSIGHTS
    if (brainMetrics) {
      if (brainMetrics.deadStockValuation > 0) {
        const id = 'notif-brain-deadstock';
        notifs.push({
          id,
          category: 'ai',
          title: 'Velcora AI: Dead Stock Alert',
          message: `Identified ${VelcoraPricingEngine.formatCurrency(brainMetrics.deadStockValuation, currency)} in non-moving inventory. Consider launching a clearance bundle or discount.`,
          time: 'Live Diagnostic',
          timestamp: Date.now() - 3600000,
          isRead: readIds.has(id),
          actionModule: 'business_brain',
          actionLabel: 'Open Brain',
        });
      }

      if (brainMetrics.profitMargin < 15 && brainMetrics.totalRevenue > 0) {
        const id = 'notif-brain-margin-low';
        notifs.push({
          id,
          category: 'ai',
          title: 'Velcora AI: Margin Warning',
          message: `Current profit margin is ${brainMetrics.profitMargin.toFixed(1)}%. Review high operating expenses and supplier purchase costs to protect gross margin.`,
          time: 'Live Diagnostic',
          timestamp: Date.now() - 1800000,
          isRead: readIds.has(id),
          actionModule: 'business_brain',
          actionLabel: 'Analyze Margin',
        });
      } else if (brainMetrics.totalRevenue > 1000) {
        const id = 'notif-brain-performance';
        notifs.push({
          id,
          category: 'ai',
          title: 'Velcora AI: Revenue Milestone',
          message: `Realized gross revenue stands at ${VelcoraPricingEngine.formatCurrency(brainMetrics.totalRevenue, currency)} across ${brainMetrics.totalTransactions} transactions with a ${brainMetrics.profitMargin.toFixed(1)}% profit margin.`,
          time: 'Live Diagnostic',
          timestamp: Date.now() - 900000,
          isRead: readIds.has(id),
          actionModule: 'business_brain',
          actionLabel: 'View Analytics',
        });
      }
    }

    // Filter out notifications that were cleared before their timestamp (if applicable)
    const activeNotifs = notifs.filter(n => clearedTs === 0 || n.timestamp > clearedTs || !readIds.has(n.id));

    // Sort by timestamp descending
    return activeNotifs.sort((a, b) => b.timestamp - a.timestamp);
  }
}
