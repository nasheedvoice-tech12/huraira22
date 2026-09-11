import React, { useState, useMemo } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, PieChart,
  Calendar, Layers, Check, X, AlertCircle, Edit2, Trash2, AlertTriangle,
  PiggyBank, FileText, CreditCard, Users, HandCoins, ArrowLeftRight,
  ArrowUpRight, ArrowDownLeft, Landmark, ShoppingBag
} from 'lucide-react';
import { Expense, OtherIncome, Budget, Loan, CustomerCredit, SupplierPayable } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';
import { useTranslation } from '../context/TranslationContext';

export const FinancialManagement: React.FC = () => {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    otherIncomes,
    addOtherIncome,
    updateOtherIncome,
    deleteOtherIncome,
    budgets,
    addBudget,
    updateBudget,
    deleteBudget,
    loans,
    addLoan,
    updateLoan,
    deleteLoan,
    addLoanPayment,
    customerCredits,
    addCustomerCredit,
    recordCustomerCreditPayment,
    supplierPayables,
    addSupplierPayable,
    recordSupplierPayablePayment,
    customers,
    suppliers,
    sales,
    purchaseOrders,
    brainMetrics,
    currency,
    activeBusiness,
    activeUser
  } = useVelcora();
  const { t, locale, setLocale } = useTranslation();
  const currencySymbol = currency || activeBusiness.currencySymbol || '$';

  const [activeTab, setActiveTab] = useState<'overview' | 'cashflow' | 'expenses' | 'income' | 'budgets' | 'debts' | 'credits'>('overview');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Modals state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [showAddPayableModal, setShowAddPayableModal] = useState(false);

  // Active logging target
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState<CustomerCredit | null>(null);
  const [selectedPayableForPayment, setSelectedPayableForPayment] = useState<SupplierPayable | null>(null);

  // Edit states
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAuthorized = activeUser?.roleId === 'role-owner' || activeUser?.roleId === 'role-manager' || activeUser?.roleId === 'role-admin';

  // --- FORM STATES ---
  // Expense
  const [expTitle, setExpTitle] = useState('');
  const [expCat, setExpCat] = useState<'Rent' | 'Salaries' | 'Utilities' | 'Marketing' | 'Transport' | 'Maintenance' | 'Taxes' | 'Software' | 'Packaging' | 'Miscellaneous'>('Rent');
  const [expAmt, setExpAmt] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Other Income
  const [incTitle, setIncTitle] = useState('');
  const [incCat, setIncCat] = useState<'Service Fees' | 'Commissions' | 'Rental' | 'Interest' | 'Miscellaneous'>('Service Fees');
  const [incAmt, setIncAmt] = useState('');
  const [incNotes, setIncNotes] = useState('');

  // Budget
  const [budName, setBudName] = useState('');
  const [budStarting, setBudStarting] = useState('');
  const [budIncomeTarget, setBudIncomeTarget] = useState('');
  const [budExpenseLimit, setBudExpenseLimit] = useState('');
  const [budSavingsTarget, setBudSavingsTarget] = useState('');
  const [budDebtRepayment, setBudDebtRepayment] = useState('');
  const [budPeriod, setBudPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'project'>('monthly');
  const [budNotes, setBudNotes] = useState('');

  // Loan
  const [loanPartner, setLoanPartner] = useState('');
  const [loanType, setLoanType] = useState<'borrowed' | 'lent'>('borrowed');
  const [loanAmt, setLoanAmt] = useState('');
  const [loanInterest, setLoanInterest] = useState('');
  const [loanSchedule, setLoanSchedule] = useState<'one-time' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [loanNotes, setLoanNotes] = useState('');
  const [loanDurationMonths, setLoanDurationMonths] = useState('12');

  // Customer Credit
  const [creditCustId, setCreditCustId] = useState('');
  const [creditInvoiceId, setCreditInvoiceId] = useState('');
  const [creditAmt, setCreditAmt] = useState('');
  const [creditNotes, setCreditNotes] = useState('');

  // Supplier Payable
  const [payableSuppId, setPayableSuppId] = useState('');
  const [payablePurchaseId, setPayablePurchaseId] = useState('');
  const [payableAmt, setPayableAmt] = useState('');
  const [payableNotes, setPayableNotes] = useState('');

  // Pay Log states
  const [paymentAmt, setPaymentAmt] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(t('bank'));

  // --- DYNAMIC CALCULATIONS (THE REAL COCKPIT) ---
  const totals = useMemo(() => {
    // 1. Opening Cash (from active budget if defined, otherwise 0)
    let openingCash = 0;
    if (budgets && budgets.length > 0) {
      const activeBudget = budgets.find(b => {
        const now = new Date();
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        return now >= start && now <= end;
      }) || budgets[0];
      if (activeBudget && typeof activeBudget.startingAmount === 'number' && !isNaN(activeBudget.startingAmount)) {
        openingCash = activeBudget.startingAmount;
      }
    }

    // 2. Sales Accrual vs Cash Sales vs Refunds
    let totalSalesAccrual = 0;
    let totalUnpaidCreditExtended = 0;
    let totalCashSales = 0;
    let totalCashRefunds = 0;

    (sales || []).forEach(s => {
      if (s.status === 'cancelled') return;

      totalSalesAccrual += s.grandTotal || 0;

      // Extract direct cash tender payments from recorded payments
      if (s.payments && Array.isArray(s.payments) && s.payments.length > 0) {
        s.payments.forEach(p => {
          if (p.method === 'cash') {
            totalCashSales += (p.amount || 0);
          }
        });
      } else if (s.status === 'completed') {
        const creditBalance = (customerCredits || []).find(cc => cc.invoiceId === s.id)?.remainingBalance || 0;
        const paidAmount = Math.max(0, (s.grandTotal || 0) - creditBalance);
        if (s.channel === 'pos' && !creditBalance) {
          totalCashSales += paidAmount;
        }
      }

      // Record cash refunds from customer return history
      if (s.returnHistory && Array.isArray(s.returnHistory) && s.returnHistory.length > 0) {
        s.returnHistory.forEach(ret => {
          if (ret.refundMethod === 'cash') {
            totalCashRefunds += (ret.refundAmount || 0);
          }
        });
      } else if (s.refundedAmount && s.refundedAmount > 0) {
        totalCashRefunds += s.refundedAmount;
      }
    });

    (customerCredits || []).forEach(cc => {
      totalUnpaidCreditExtended += cc.remainingBalance || 0;
    });

    const totalSalesCashReceived = totalCashSales;

    // 3. Customer Credit Payments Collected (Cash Received)
    let totalCustomerCreditPaymentsReceived = 0;
    (customerCredits || []).forEach(cc => {
      (cc.payments || []).forEach(p => {
        totalCustomerCreditPaymentsReceived += p.amount || 0;
      });
    });

    // 4. OpEx (Cash Expenses)
    const totalOpEx = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

    // 5. Purchases & Supplier Cash Payments
    let totalCashPurchases = 0;
    (purchaseOrders || []).forEach(po => {
      if (po.status !== 'cancelled') {
        totalCashPurchases += (po.amountPaid || 0);
      }
    });

    let totalSupplierPayablePaymentsMade = 0;
    (supplierPayables || []).forEach(sp => {
      (sp.payments || []).forEach(p => {
        totalSupplierPayablePaymentsMade += p.amount || 0;
      });
    });

    const totalPurchasesAndSupplierCashPaid = Math.max(totalCashPurchases, totalSupplierPayablePaymentsMade) || (totalCashPurchases + totalSupplierPayablePaymentsMade);

    // 6. Other Cash Incomes
    const totalOtherIncome = (otherIncomes || []).reduce((sum, oi) => sum + (oi.amount || 0), 0);

    // 7. Loans & Debt Flows
    const totalBorrowedPrincipal = (loans || []).filter(l => l.type === 'borrowed').reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalBorrowedRepaid = (loans || []).filter(l => l.type === 'borrowed').reduce((sum, l) => sum + (l.amountPaid || 0), 0);
    const netBorrowedOutstanding = totalBorrowedPrincipal - totalBorrowedRepaid;

    const totalLentPrincipal = (loans || []).filter(l => l.type === 'lent').reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalLentRepaid = (loans || []).filter(l => l.type === 'lent').reduce((sum, l) => sum + (l.amountPaid || 0), 0);
    const netLentOutstanding = totalLentPrincipal - totalLentRepaid;

    const netSupplierOwed = (supplierPayables || []).reduce((sum, sp) => sum + (sp.remainingBalance || 0), 0);

    // 8. Dynamic Cash in Hand Formula:
    // Cash in Hand = Opening Cash + Cash Sales + Cash Received - Cash Expenses - Cash Purchases - Cash Refunds/Withdrawals
    const cashInflows = totalCashSales + totalCustomerCreditPaymentsReceived + totalBorrowedPrincipal + totalLentRepaid + totalOtherIncome;
    const cashOutflows = totalOpEx + totalPurchasesAndSupplierCashPaid + totalBorrowedRepaid + totalLentPrincipal + totalCashRefunds;
    const actualCashOnHand = openingCash + cashInflows - cashOutflows;

    const hasRecordedTransactions = Boolean(
      (sales && sales.length > 0) ||
      (expenses && expenses.length > 0) ||
      (otherIncomes && otherIncomes.length > 0) ||
      (loans && loans.length > 0) ||
      (customerCredits && customerCredits.length > 0) ||
      (supplierPayables && supplierPayables.length > 0) ||
      (purchaseOrders && purchaseOrders.length > 0) ||
      openingCash > 0
    );

    // 9. Accrual Profits
    const realizedNetProfit = totalSalesAccrual + totalOtherIncome - (brainMetrics?.cogs || 0) - totalOpEx;
    const profitMargin = totalSalesAccrual > 0 ? Math.round((realizedNetProfit / totalSalesAccrual) * 100) : 0;

    // 10. Real Debt-to-Cash Ratio Calculation
    // Formula: Debt-to-Cash Ratio = Total Outstanding Debt ÷ Actual Cash in Hand × 100
    // Total Outstanding Debt combines active borrowed loans principal remaining + supplier payables remaining
    const totalOutstandingDebt = Math.max(0, netBorrowedOutstanding + netSupplierOwed);
    let debtToCashRatio: number | null = null;
    let debtToCashDisplay = 'No data available';

    if (!hasRecordedTransactions && totalOutstandingDebt === 0 && actualCashOnHand === 0) {
      debtToCashRatio = null;
      debtToCashDisplay = 'No data available';
    } else if (actualCashOnHand > 0) {
      const calculated = (totalOutstandingDebt / actualCashOnHand) * 100;
      debtToCashRatio = calculated;
      debtToCashDisplay = calculated > 0 && calculated < 1 ? `${calculated.toFixed(1)}%` : `${Math.round(calculated)}%`;
    } else if (actualCashOnHand <= 0 && totalOutstandingDebt > 0) {
      debtToCashRatio = 100;
      debtToCashDisplay = '>100%';
    } else if (totalOutstandingDebt === 0) {
      debtToCashRatio = 0;
      debtToCashDisplay = '0%';
    }

    return {
      openingCash,
      totalSalesAccrual,
      totalUnpaidCreditExtended,
      totalSalesCashReceived,
      totalCashSales,
      totalCashRefunds,
      totalOpEx,
      totalOtherIncome,
      totalOutstandingDebt,
      netBorrowedOutstanding,
      netLentOutstanding,
      netSupplierOwed,
      actualCashOnHand,
      cashInflows,
      cashOutflows,
      realizedNetProfit,
      profitMargin,
      debtToCashRatio,
      debtToCashDisplay,
      totalCustomerCreditPaymentsReceived,
      totalSupplierPayablePaymentsMade: totalPurchasesAndSupplierCashPaid,
      hasRecordedTransactions,
    };
  }, [sales, expenses, otherIncomes, loans, customerCredits, supplierPayables, purchaseOrders, budgets, brainMetrics?.cogs]);

  // --- ACTIONS ---
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmt) || 0;
    if (amt <= 0) return;

    if (editingExpenseId) {
      updateExpense(editingExpenseId, {
        title: expTitle.trim() || 'Store Expense',
        category: expCat,
        amount: amt,
        receiptNote: expNotes.trim(),
      });
    } else {
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        businessId: activeBusiness.id,
        title: expTitle.trim() || 'Store Expense',
        category: expCat,
        amount: amt,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: t('bank'),
        receiptNote: expNotes.trim(),
        isRecurring: false,
      };
      addExpense(newExp);
    }
    setShowAddExpenseModal(false);
    resetExpenseForm();
  };

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(incAmt) || 0;
    if (amt <= 0) return;

    const newInc: OtherIncome = {
      id: `inc-${Date.now()}`,
      businessId: activeBusiness.id,
      title: incTitle.trim() || 'Operating Service Fee',
      category: incCat,
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      notes: incNotes.trim(),
    };
    addOtherIncome(newInc);
    setShowAddIncomeModal(false);
    resetIncomeForm();
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseFloat(budStarting) || 0;
    const incT = parseFloat(budIncomeTarget) || 0;
    const expL = parseFloat(budExpenseLimit) || 0;
    const savT = parseFloat(budSavingsTarget) || 0;
    const debtR = parseFloat(budDebtRepayment) || 0;

    const newBudget: Budget = {
      id: editingBudgetId || `bud-${Date.now()}`,
      businessId: activeBusiness.id,
      name: budName.trim() || `${budPeriod.toUpperCase()} Operating Plan`,
      period: budPeriod,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      startingAmount: start,
      incomeTarget: incT,
      expenseLimit: expL,
      categoryLimits: {
        'Rent': expL * 0.3,
        'Salaries': expL * 0.4,
        'Marketing': expL * 0.15,
        'Utilities': expL * 0.1,
        'Miscellaneous': expL * 0.05,
      },
      savingsTarget: savT,
      emergencyReserveTarget: savT * 0.5,
      debtRepaymentTarget: debtR,
      actualIncome: totals.totalSalesAccrual,
      actualSpent: totals.totalOpEx,
      notes: budNotes.trim()
    };

    if (editingBudgetId) {
      updateBudget(editingBudgetId, newBudget);
    } else {
      addBudget(newBudget);
    }
    setShowAddBudgetModal(false);
    resetBudgetForm();
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(loanAmt) || 0;
    if (amt <= 0) return;

    const interest = parseFloat(loanInterest) || 0;
    const dur = parseInt(loanDurationMonths) || 12;

    const newLoan: Loan = {
      id: editingLoanId || `loan-${Date.now()}`,
      businessId: activeBusiness.id,
      type: loanType,
      partner: loanPartner.trim(),
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + dur * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      interestRate: interest,
      repaymentSchedule: loanSchedule,
      amountPaid: 0,
      status: 'Active',
      notes: loanNotes.trim(),
      payments: []
    };

    if (editingLoanId) {
      updateLoan(editingLoanId, newLoan);
    } else {
      addLoan(newLoan);
    }
    setShowAddLoanModal(false);
    resetLoanForm();
  };

  const handleSaveCredit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(creditAmt) || 0;
    if (amt <= 0 || !creditCustId) return;

    const customerObj = customers.find(c => c.id === creditCustId);

    const newCredit: CustomerCredit = {
      id: `cc-${Date.now()}`,
      businessId: activeBusiness.id,
      customerId: creditCustId,
      customerName: customerObj?.name || 'Valued Customer',
      invoiceId: creditInvoiceId.trim() || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      totalAmount: amt,
      amountPaid: 0,
      remainingBalance: amt,
      dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
      notes: creditNotes.trim(),
      payments: []
    };

    addCustomerCredit(newCredit);
    setShowAddCreditModal(false);
    resetCreditForm();
  };

  const handleSavePayable = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payableAmt) || 0;
    if (amt <= 0 || !payableSuppId) return;

    const supplierObj = suppliers.find(s => s.id === payableSuppId);

    const newPayable: SupplierPayable = {
      id: `sp-${Date.now()}`,
      businessId: activeBusiness.id,
      supplierId: payableSuppId,
      supplierName: supplierObj?.name || 'Key Supplier Partner',
      purchaseId: payablePurchaseId.trim() || `PO-${Math.floor(100 + Math.random() * 900)}`,
      totalAmount: amt,
      amountPaid: 0,
      remainingBalance: amt,
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      notes: payableNotes.trim(),
      payments: []
    };

    addSupplierPayable(newPayable);
    setShowAddPayableModal(false);
    resetPayableForm();
  };

  const handleAddLoanPaymentLog = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmt) || 0;
    if (amt <= 0 || !selectedLoanForPayment) return;

    addLoanPayment(selectedLoanForPayment.id, {
      date: new Date().toISOString().split('T')[0],
      amount: amt,
      reference: paymentRef.trim() || 'Direct ledger update'
    });

    setSelectedLoanForPayment(null);
    setPaymentAmt('');
    setPaymentRef('');
  };

  const handleAddCreditPaymentLog = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmt) || 0;
    if (amt <= 0 || !selectedCreditForPayment) return;

    recordCustomerCreditPayment(selectedCreditForPayment.id, {
      date: new Date().toISOString().split('T')[0],
      amount: amt,
      method: paymentMethod
    });

    setSelectedCreditForPayment(null);
    setPaymentAmt('');
    setPaymentMethod(t('bank'));
  };

  const handleAddPayablePaymentLog = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmt) || 0;
    if (amt <= 0 || !selectedPayableForPayment) return;

    recordSupplierPayablePayment(selectedPayableForPayment.id, {
      date: new Date().toISOString().split('T')[0],
      amount: amt,
      method: paymentMethod
    });

    setSelectedPayableForPayment(null);
    setPaymentAmt('');
    setPaymentMethod(t('bank'));
  };

  // --- RESET HANDLERS ---
  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpTitle('');
    setExpCat('Rent');
    setExpAmt('');
    setExpNotes('');
  };

  const resetIncomeForm = () => {
    setIncTitle('');
    setIncCat('Service Fees');
    setIncAmt('');
    setIncNotes('');
  };

  const resetBudgetForm = () => {
    setEditingBudgetId(null);
    setBudName('');
    setBudStarting('');
    setBudIncomeTarget('');
    setBudExpenseLimit('');
    setBudSavingsTarget('');
    setBudDebtRepayment('');
    setBudPeriod('monthly');
    setBudNotes('');
  };

  const resetLoanForm = () => {
    setEditingLoanId(null);
    setLoanPartner('');
    setLoanType('borrowed');
    setLoanAmt('');
    setLoanInterest('');
    setLoanSchedule('monthly');
    setLoanNotes('');
    setLoanDurationMonths('12');
  };

  const resetCreditForm = () => {
    setCreditCustId('');
    setCreditInvoiceId('');
    setCreditAmt('');
    setCreditNotes('');
  };

  const resetPayableForm = () => {
    setPayableSuppId('');
    setPayablePurchaseId('');
    setPayableAmt('');
    setPayableNotes('');
  };

  const handleOpenEditExpense = (e: Expense) => {
    setEditingExpenseId(e.id);
    setExpTitle(e.title);
    setExpCat(e.category as any);
    setExpAmt(e.amount.toString());
    setExpNotes(e.receiptNote || '');
    setShowAddExpenseModal(true);
  };

  const handleOpenEditBudget = (b: Budget) => {
    setEditingBudgetId(b.id);
    setBudName(b.name);
    setBudStarting(b.startingAmount.toString());
    setBudIncomeTarget(b.incomeTarget.toString());
    setBudExpenseLimit(b.expenseLimit.toString());
    setBudSavingsTarget(b.savingsTarget.toString());
    setBudDebtRepayment(b.debtRepaymentTarget?.toString() || '');
    setBudPeriod(b.period);
    setBudNotes(b.notes || '');
    setShowAddBudgetModal(true);
  };

  const handleOpenEditLoan = (l: Loan) => {
    setEditingLoanId(l.id);
    setLoanPartner(l.partner);
    setLoanType(l.type);
    setLoanAmt(l.amount.toString());
    setLoanInterest(l.interestRate.toString());
    setLoanSchedule(l.repaymentSchedule);
    setLoanNotes(l.notes || '');
    setShowAddLoanModal(true);
  };

  return (
    <div id="velcora-financial-mgmt" className="space-y-6 text-slate-800 dark:text-[#F8FAFC]">
      {permissionError && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs font-semibold shadow-xs animate-in slide-in-from-top-4">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{permissionError}</span>
          </div>
          <button onClick={() => setPermissionError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">Velcora Unified Financial Console</h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium mt-1">
            Live money tracking, liquidity monitoring, debt mapping & strict cash-flow analysis for <span className="font-bold text-[#2563EB] dark:text-[#3B82F6]">{activeBusiness.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetBudgetForm();
              setShowAddBudgetModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0B1220] dark:hover:bg-[#152644] text-xs font-bold border border-slate-200 dark:border-[#1F2E4D] flex items-center gap-1.5 transition"
          >
            <PiggyBank className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Setup Budget Plan</span>
          </button>
        </div>
      </div>

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8]">Cash in Hand</span>
            <Landmark className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {!totals.hasRecordedTransactions ? (
              <span className="text-lg font-bold text-slate-400 dark:text-slate-500">No data</span>
            ) : (
              VelcoraPricingEngine.formatCurrency(totals.actualCashOnHand, currency)
            )}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]/70 font-semibold leading-relaxed">
            Opening cash + Cash sales & collections − Cash expenses, purchases & refunds
          </p>
        </div>

        <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8]">Gross Revenue (Accrual)</span>
            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
            {VelcoraPricingEngine.formatCurrency(totals.totalSalesAccrual, currency)}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]/70 font-semibold leading-relaxed">
            Includes {VelcoraPricingEngine.formatCurrency(totals.totalUnpaidCreditExtended, currency)} extended on customer credit term
          </p>
        </div>

        <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8]">Operating Expenses (OpEx)</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {VelcoraPricingEngine.formatCurrency(totals.totalOpEx, currency)}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]/70 font-semibold leading-relaxed">
            OpEx cost categories paid from cash reserves
          </p>
        </div>

        <div className="bg-white dark:bg-[#111C30] p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8]">Realized Net Profit</span>
            <PieChart className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div className="text-2xl font-extrabold text-[#8B5CF6] dark:text-[#A78BFA]">
            {VelcoraPricingEngine.formatCurrency(totals.realizedNetProfit, currency)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]/70 font-semibold">Excludes loans borrowed</span>
            <span className="text-[10px] font-bold text-[#8B5CF6] dark:text-[#A78BFA] bg-[#8B5CF6]/10 px-2 py-0.5 rounded-full">{totals.profitMargin}% Margin</span>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE TABS NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111C30] p-4 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] p-1.5 rounded-2xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'cashflow'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
            }`}
          >
            Cash Flow Ledger
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
            }`}
          >
            OpEx ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'income'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
            }`}
          >
            Other Income ({otherIncomes.length})
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'budgets'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
            }`}
          >
            Budgets vs Actual
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'debts'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
            }`}
          >
            Lending & Borrowing ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'credits'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
            }`}
          >
            Credits & Liabilities
          </button>
        </div>

        {/* Dynamic primary CTA button based on active tab */}
        {activeTab === 'expenses' ? (
          <button
            onClick={() => {
              resetExpenseForm();
              setShowAddExpenseModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record OpEx Expense</span>
          </button>
        ) : activeTab === 'income' ? (
          <button
            onClick={() => {
              resetIncomeForm();
              setShowAddIncomeModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Other Income</span>
          </button>
        ) : activeTab === 'debts' ? (
          <button
            onClick={() => {
              resetLoanForm();
              setShowAddLoanModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Debt/Loan Record</span>
          </button>
        ) : activeTab === 'credits' ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetCreditForm();
                setShowAddCreditModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Customer Credit</span>
            </button>
            <button
              onClick={() => {
                resetPayableForm();
                setShowAddPayableModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Supplier Liability</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* --- TAB VIEWPORTS --- */}

      {/* 1. FINANCIAL OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Sheet Highlights */}
            <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">Unified Balance Sheet Highlights</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-100 dark:border-[#1E2E4A]/40 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">Customer Receivables</span>
                    <p className="text-base font-extrabold text-violet-600 dark:text-violet-400">
                      {VelcoraPricingEngine.formatCurrency(totals.totalUnpaidCreditExtended, currency)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">Awaiting collection</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-100 dark:border-[#1E2E4A]/40 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">Supplier Payables</span>
                    <p className="text-base font-extrabold text-amber-600 dark:text-amber-500">
                      {VelcoraPricingEngine.formatCurrency(totals.netSupplierOwed, currency)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">Aged balances owed</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-100 dark:border-[#1E2E4A]/40 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                    <HandCoins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">Loans Receivable (Lent Out)</span>
                    <p className="text-base font-extrabold text-sky-600 dark:text-sky-400">
                      {VelcoraPricingEngine.formatCurrency(totals.netLentOutstanding, currency)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">Principal due from partners</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-100 dark:border-[#1E2E4A]/40 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">Loans Payable (Borrowed Debt)</span>
                    <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                      {VelcoraPricingEngine.formatCurrency(totals.netBorrowedOutstanding, currency)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">Outstanding business debt</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">Velcora Financial Insights Engine</h3>
              <div className="space-y-3.5">
                {totals.actualCashOnHand < totals.netSupplierOwed + totals.netBorrowedOutstanding ? (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold">Liquidity Warning (High Leverage)</p>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1">
                        Outstanding debts and supplier payables ({VelcoraPricingEngine.formatCurrency(totals.netSupplierOwed + totals.netBorrowedOutstanding, currency)}) exceed actual cash reserves on hand. Prioritize customer credit collections to improve operational cash.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold">Liquidity Health: Excellent</p>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1">
                        Cash on hand exceeds all near-term debt and supplier liabilities. Business maintains strong liquidity to leverage purchasing discounts or raw fabric expansions.
                      </p>
                    </div>
                  </div>
                )}

                {totals.totalUnpaidCreditExtended > 0 && (
                  <div className="p-4 rounded-2xl bg-[#2563EB]/5 border border-[#2563EB]/20 flex gap-3 text-xs text-slate-800 dark:text-slate-300">
                    <AlertCircle className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold">Accrual vs. Cash Flow Gap</p>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1">
                        {VelcoraPricingEngine.formatCurrency(totals.totalUnpaidCreditExtended, currency)} of sales revenue is currently tied up in outstanding customer credits. Velcora recommends initiating automatic billing triggers on high-tier customers.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">Debt & Leverage Risk</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Debt-to-Cash Ratio</span>
                    <span className={totals.debtToCashRatio === null ? 'text-slate-400 dark:text-slate-500 font-medium' : 'text-rose-500'}>
                      {totals.debtToCashDisplay}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#0B1220] h-2 rounded-full overflow-hidden border border-slate-200 dark:border-[#1F2E4D]">
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${totals.debtToCashRatio === null ? 0 : Math.min(100, Math.max(0, totals.debtToCashRatio))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Unpaid Customer Ratio</span>
                    <span className={!totals.hasRecordedTransactions && totals.totalSalesAccrual === 0 ? 'text-slate-400 dark:text-slate-500 font-medium' : 'text-violet-500'}>
                      {!totals.hasRecordedTransactions && totals.totalSalesAccrual === 0
                        ? 'No data available'
                        : `${totals.totalSalesAccrual > 0 ? Math.round((totals.totalUnpaidCreditExtended / totals.totalSalesAccrual) * 100) : 0}%`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#0B1220] h-2 rounded-full overflow-hidden border border-slate-200 dark:border-[#1F2E4D]">
                    <div
                      className="h-full bg-violet-500"
                      style={{ width: `${!totals.hasRecordedTransactions && totals.totalSalesAccrual === 0 ? 0 : Math.min(100, totals.totalSalesAccrual > 0 ? (totals.totalUnpaidCreditExtended / totals.totalSalesAccrual) * 100 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">Lending Rules</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium leading-relaxed">
                Borrowed money is categorized under liabilities and does NOT contribute to business profits. Unpaid customer credit terms are counted as credit assets and do not increase immediate cash balances.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. CASH FLOW STATEMENT VIEW */}
      {activeTab === 'cashflow' && (
        <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">Comprehensive Cash Flow Statement</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium mt-1">
              Reflects only actual cash movement. Unpaid credit sales are categorized strictly as receivables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash Inflows */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-[#1E2E4A]/40 pb-2">
                <ArrowDownLeft className="w-4 h-4" />
                <span>Cash Inflows (Money In)</span>
              </h4>

              <div className="space-y-3 text-xs">
                {totals.openingCash > 0 && (
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Opening Cash Reserve</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{VelcoraPricingEngine.formatCurrency(totals.openingCash, currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Cash POS Sales (Direct Tender)</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{VelcoraPricingEngine.formatCurrency(totals.totalSalesCashReceived, currency)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Customer Credit Payments Collected</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{VelcoraPricingEngine.formatCurrency(totals.totalCustomerCreditPaymentsReceived, currency)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">New Loans Borrowed (Principal)</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{VelcoraPricingEngine.formatCurrency(loans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + (l.amount || 0), 0), currency)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Lent Principal Repayments Received</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{VelcoraPricingEngine.formatCurrency(loans.filter(l => l.type === 'lent').reduce((sum, l) => sum + (l.amountPaid || 0), 0), currency)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Other Non-POS Operating Incomes</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{VelcoraPricingEngine.formatCurrency(totals.totalOtherIncome, currency)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-sm">
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-300">Total Cash Receipts (Inflow)</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                    {VelcoraPricingEngine.formatCurrency(totals.cashInflows, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Outflows */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-[#1E2E4A]/40 pb-2">
                <ArrowUpRight className="w-4 h-4" />
                <span>Cash Outflows (Money Out)</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Operating Expenses Paid (OpEx)</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">
                    -{VelcoraPricingEngine.formatCurrency(totals.totalOpEx, currency)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Payments for Purchases & Suppliers</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">
                    -{VelcoraPricingEngine.formatCurrency(totals.totalSupplierPayablePaymentsMade, currency)}
                  </span>
                </div>

                {totals.totalCashRefunds > 0 && (
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Customer Cash Returns & Refunds</span>
                    <span className="font-extrabold text-rose-600 dark:text-rose-400">
                      -{VelcoraPricingEngine.formatCurrency(totals.totalCashRefunds, currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Borrowed Debt Repayments Made</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">
                    -{VelcoraPricingEngine.formatCurrency(loans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + (l.amountPaid || 0), 0), currency)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-slate-50 dark:bg-[#0B1220] rounded-xl">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Lent Principal Disbursed Out</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">
                    -{VelcoraPricingEngine.formatCurrency(loans.filter(l => l.type === 'lent').reduce((sum, l) => sum + (l.amount || 0), 0), currency)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/40 text-sm">
                  <span className="font-extrabold text-rose-800 dark:text-rose-300">Total Cash Payments (Outflow)</span>
                  <span className="font-extrabold text-rose-700 dark:text-rose-400">
                    {VelcoraPricingEngine.formatCurrency(totals.cashOutflows, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Summary Footer */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-slate-700 dark:text-slate-300">Net Calculated Cash in Hand:</span>
            </div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {!totals.hasRecordedTransactions ? 'No data' : VelcoraPricingEngine.formatCurrency(totals.actualCashOnHand, currency)}
            </div>
          </div>
        </div>
      )}

      {/* 3. OPEX EXPENSES TABLE VIEW */}
      {activeTab === 'expenses' && (
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Expense Title / Vendor</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No expenses recorded for this business.</td>
                  </tr>
                ) : (
                  expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                      <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8]">{exp.date}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#152644] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#1F2E4D] text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-[#F8FAFC] font-bold">
                        {exp.title}
                        {exp.receiptNote && (
                          <span className="block text-[10px] text-slate-400 font-medium normal-case mt-0.5">{exp.receiptNote}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-rose-600 dark:text-rose-400">
                        -{VelcoraPricingEngine.formatCurrency(exp.amount, currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditExpense(exp)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-[#2563EB] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {deleteConfirmId === exp.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 p-1 rounded-xl border border-rose-200 dark:border-rose-900/40">
                              <button
                                onClick={() => {
                                  if (!isAuthorized) {
                                    setPermissionError("You do not have permission to delete financial records. Only Owners or Managers can delete records.");
                                    setDeleteConfirmId(null);
                                    return;
                                  }
                                  deleteExpense(exp.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-1 text-[9px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-1 text-[9px] font-bold text-slate-500"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(exp.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-[#FB7185] hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. OTHER INCOME VIEW */}
      {activeTab === 'income' && (
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Income Stream / Source</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
                {otherIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No secondary operating income recorded yet.</td>
                  </tr>
                ) : (
                  otherIncomes.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                      <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8]">{inc.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-[#F8FAFC]">{inc.title}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500">{inc.category}</td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8]">{inc.notes || '-'}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{VelcoraPricingEngine.formatCurrency(inc.amount, currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            if (!isAuthorized) {
                              setPermissionError("Action restricted.");
                              return;
                            }
                            deleteOtherIncome(inc.id);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-[#FB7185] hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                          title="Delete Stream"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. BUDGETS VS ACTUALS */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map(b => {
              const incomeProgress = b.incomeTarget > 0 ? Math.round((totals.totalSalesAccrual / b.incomeTarget) * 100) : 0;
              const expenseProgress = b.expenseLimit > 0 ? Math.round((totals.totalOpEx / b.expenseLimit) * 100) : 0;
              const isOverExpense = totals.totalOpEx > b.expenseLimit;

              return (
                <div key={b.id} className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-[#F8FAFC]">{b.name}</h4>
                    <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-[#0B1220] px-2 py-0.5 rounded-md">{b.period}</span>
                  </div>

                  {/* Income Target Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Income Target</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                        {incomeProgress}% ({VelcoraPricingEngine.formatCurrency(totals.totalSalesAccrual, currency)} / {VelcoraPricingEngine.formatCurrency(b.incomeTarget, currency)})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-[#0B1220] h-2 rounded-full overflow-hidden border border-slate-200 dark:border-[#1F2E4D]">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, incomeProgress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Expense Limit Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Expense Cap</span>
                      <span className={`font-extrabold ${isOverExpense ? 'text-rose-500 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {expenseProgress}% ({VelcoraPricingEngine.formatCurrency(totals.totalOpEx, currency)} / {VelcoraPricingEngine.formatCurrency(b.expenseLimit, currency)})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-[#0B1220] h-2 rounded-full overflow-hidden border border-slate-200 dark:border-[#1F2E4D]">
                      <div
                        className={`h-full ${isOverExpense ? 'bg-rose-500' : 'bg-blue-600 dark:bg-blue-500'}`}
                        style={{ width: `${Math.min(100, expenseProgress)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-bold pt-2 border-t border-slate-100 dark:border-[#1E2E4A]/30">
                    <span className="text-slate-400">Savings Target: {VelcoraPricingEngine.formatCurrency(b.savingsTarget, currency)}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenEditBudget(b)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteBudget(b.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. DEBTS LEDGER VIEW */}
      {activeTab === 'debts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] mb-4">Lending & Borrowing Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Direction</th>
                    <th className="py-3.5 px-4">Partner Entity</th>
                    <th className="py-3.5 px-4">Principal Value</th>
                    <th className="py-3.5 px-4">Interest Rate</th>
                    <th className="py-3.5 px-4">Total Paid Back</th>
                    <th className="py-3.5 px-4">Remaining Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">No borrow or lending logs present in the ledger.</td>
                    </tr>
                  ) : (
                    loans.map(l => {
                      const remain = l.amount - l.amountPaid;
                      return (
                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                          <td className="py-3.5 px-4">
                            <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase ${
                              l.type === 'borrowed'
                                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {l.type === 'borrowed' ? 'Liability' : 'Asset Lent'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-900 dark:text-[#F8FAFC] font-extrabold">{l.partner}</td>
                          <td className="py-3.5 px-4 text-slate-800 dark:text-[#F8FAFC] font-bold">{VelcoraPricingEngine.formatCurrency(l.amount, currency)}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-500">{l.interestRate}% ({l.repaymentSchedule})</td>
                          <td className="py-3.5 px-4 text-slate-500">{VelcoraPricingEngine.formatCurrency(l.amountPaid, currency)}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-[#F8FAFC]">{VelcoraPricingEngine.formatCurrency(remain, currency)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                              l.status === 'Paid'
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700'
                                : l.status === 'Partially Paid'
                                ? 'bg-sky-100 dark:bg-[#1E2E4A] text-sky-600'
                                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600'
                            }`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {remain > 0 && (
                                <button
                                  onClick={() => {
                                    setPaymentAmt('');
                                    setPaymentRef('');
                                    setSelectedLoanForPayment(l);
                                  }}
                                  className="px-2.5 py-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg text-[10px] font-bold transition"
                                >
                                  {l.type === 'borrowed' ? 'Pay Back' : 'Collect Pay'}
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditLoan(l)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteLoan(l.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECORD LOAN PAYMENT */}
          {selectedLoanForPayment && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <form
                onSubmit={handleAddLoanPaymentLog}
                className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1F2E4D]">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">
                    Log Loan Repayment Activity
                  </h3>
                  <button type="button" onClick={() => setSelectedLoanForPayment(null)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Register repayment to/from <span className="font-extrabold text-slate-800 dark:text-white">{selectedLoanForPayment.partner}</span>. Outstanding principal remaining is {VelcoraPricingEngine.formatCurrency(selectedLoanForPayment.amount - selectedLoanForPayment.amountPaid, currency)}.
                  </p>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Repayment Amount ({currencySymbol}) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={paymentAmt}
                      onChange={e => setPaymentAmt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-[#2563EB] font-extrabold focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Reference / Bank Receipt Id</label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      placeholder="e.g. Bank transfer ID #23891"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1F2E4D]">
                  <button
                    type="button"
                    onClick={() => setSelectedLoanForPayment(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-xs hover:bg-[#1d4ed8]"
                  >
                    Confirm Payment Entry
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 7. CREDITS & PAYABLES VIEW */}
      {activeTab === 'credits' && (
        <div className="space-y-6">
          {/* Customer Receivables */}
          <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">Customer Credit & Receivables Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Invoice ID</th>
                    <th className="py-3.5 px-4">Customer Name</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4 text-right">Amount Collected</th>
                    <th className="py-3.5 px-4 text-right">Remaining Balance</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
                  {customerCredits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No outstanding customer credit balances logged.</td>
                    </tr>
                  ) : (
                    customerCredits.map(cc => (
                      <tr key={cc.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                        <td className="py-3.5 px-4 text-slate-900 dark:text-[#F8FAFC] font-extrabold">{cc.invoiceId || 'N/A'}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white">{cc.customerName}</td>
                        <td className="py-3.5 px-4 text-rose-500 dark:text-rose-400">{cc.dueDate}</td>
                        <td className="py-3.5 px-4 text-right font-extrabold">{VelcoraPricingEngine.formatCurrency(cc.totalAmount, currency)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">{VelcoraPricingEngine.formatCurrency(cc.amountPaid, currency)}</td>
                        <td className="py-3.5 px-4 text-right text-violet-600 font-extrabold">{VelcoraPricingEngine.formatCurrency(cc.remainingBalance, currency)}</td>
                        <td className="py-3.5 px-4 text-right">
                          {cc.remainingBalance > 0 && (
                            <button
                              onClick={() => {
                                setPaymentAmt('');
                                setSelectedCreditForPayment(cc);
                              }}
                              className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold transition"
                            >
                              Collect Credit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier Payables */}
          <div className="bg-white dark:bg-[#111C30] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">Supplier Payables & Liabilities Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Purchase Order</th>
                    <th className="py-3.5 px-4">Supplier Partner</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-right">Total Owed</th>
                    <th className="py-3.5 px-4 text-right">Amount Repaid</th>
                    <th className="py-3.5 px-4 text-right">Liabilities Outstanding</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
                  {supplierPayables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No active supplier liabilities logged.</td>
                    </tr>
                  ) : (
                    supplierPayables.map(sp => (
                      <tr key={sp.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                        <td className="py-3.5 px-4 text-slate-900 dark:text-[#F8FAFC] font-extrabold">{sp.purchaseId || 'N/A'}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white">{sp.supplierName}</td>
                        <td className="py-3.5 px-4 text-rose-500 dark:text-rose-400">{sp.dueDate}</td>
                        <td className="py-3.5 px-4 text-right font-extrabold">{VelcoraPricingEngine.formatCurrency(sp.totalAmount, currency)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">{VelcoraPricingEngine.formatCurrency(sp.amountPaid, currency)}</td>
                        <td className="py-3.5 px-4 text-right text-amber-600 font-extrabold">{VelcoraPricingEngine.formatCurrency(sp.remainingBalance, currency)}</td>
                        <td className="py-3.5 px-4 text-right">
                          {sp.remainingBalance > 0 && (
                            <button
                              onClick={() => {
                                setPaymentAmt('');
                                setSelectedPayableForPayment(sp);
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition"
                            >
                              Settle Balance
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* COLLECT CUSTOMER CREDIT MODAL */}
          {selectedCreditForPayment && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <form
                onSubmit={handleAddCreditPaymentLog}
                className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1F2E4D]">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">Record Customer Credit Payment</h3>
                  <button type="button" onClick={() => setSelectedCreditForPayment(null)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Log cash or card payment collected from <span className="font-extrabold text-slate-800 dark:text-white">{selectedCreditForPayment.customerName}</span> for outstanding invoice. Remaining credit outstanding is {VelcoraPricingEngine.formatCurrency(selectedCreditForPayment.remainingBalance, currency)}.
                  </p>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Repayment Value Collected ({currencySymbol}) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={paymentAmt}
                      onChange={e => setPaymentAmt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-violet-600 font-extrabold focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Payment Channel *</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                    >
                      <option value={t('cash')}>{t('cash')}</option>
                      <option value={t('card')}>Card / Terminal</option>
                      <option value={t('bank')}>Direct Bank Wire</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1F2E4D]">
                  <button
                    type="button"
                    onClick={() => setSelectedCreditForPayment(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-xs hover:bg-violet-700"
                  >
                    Confirm Collection Log
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SETTLE SUPPLIER PAYABLE MODAL */}
          {selectedPayableForPayment && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <form
                onSubmit={handleAddPayablePaymentLog}
                className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1F2E4D]">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">Settle Supplier Liability</h3>
                  <button type="button" onClick={() => setSelectedPayableForPayment(null)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Settle outstanding purchase liability with <span className="font-extrabold text-slate-800 dark:text-white">{selectedPayableForPayment.supplierName}</span>. Total remaining liability is {VelcoraPricingEngine.formatCurrency(selectedPayableForPayment.remainingBalance, currency)}.
                  </p>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Repayment Value Paid ({currencySymbol}) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={paymentAmt}
                      onChange={e => setPaymentAmt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-amber-600 font-extrabold focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Payment Channel *</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                    >
                      <option value={t('cash')}>{t('cash')}</option>
                      <option value={t('bank')}>Company Bank Wire</option>
                      <option value="Supplier Account">Direct Supplier Account</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1F2E4D]">
                  <button
                    type="button"
                    onClick={() => setSelectedPayableForPayment(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs hover:bg-amber-700"
                  >
                    Confirm Settle Log
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* --- ADD OPEX MODAL --- */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveExpense}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">
                {editingExpenseId ? 'Edit Operating Expense' : 'Record Operating Expense'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Expense Title / Vendor *</label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  placeholder="e.g. Showroom Monthly Rent"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Expense Category *</label>
                <select
                  value={expCat}
                  onChange={e => setExpCat(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-850 dark:text-[#F8FAFC] font-bold focus:outline-hidden"
                >
                  <option value="Rent">Rent & Lease</option>
                  <option value="Salaries">Staff Salaries</option>
                  <option value="Utilities">Utilities & Electricity</option>
                  <option value="Marketing">Marketing & Promotion</option>
                  <option value="Packaging">Packaging & Bags</option>
                  <option value="Software">Software & POS Cloud</option>
                  <option value="Transport">Transport & Logistics</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Taxes">Taxes & Fees</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Amount ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expAmt}
                  onChange={e => setExpAmt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold text-rose-600 dark:text-rose-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Notes / Memo</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={e => setExpNotes(e.target.value)}
                  placeholder="e.g. Store rent receipt #1234"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition"
              >
                {editingExpenseId ? 'Save Changes' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- ADD OTHER INCOME --- */}
      {showAddIncomeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveIncome}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">Record Other Operating Income</h3>
              <button
                type="button"
                onClick={() => setShowAddIncomeModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Income Stream Title / Source *</label>
                <input
                  type="text"
                  required
                  value={incTitle}
                  onChange={e => setIncTitle(e.target.value)}
                  placeholder="e.g. Tailoring & Alteration Service"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Income Category *</label>
                <select
                  value={incCat}
                  onChange={e => setIncCat(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                >
                  <option value="Service Fees">Service Fees</option>
                  <option value="Commissions">Commissions</option>
                  <option value="Rental">Rental Income</option>
                  <option value="Interest">Interest Earned</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Amount ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={incAmt}
                  onChange={e => setIncAmt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold text-emerald-600 dark:text-emerald-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Notes</label>
                <input
                  type="text"
                  value={incNotes}
                  onChange={e => setIncNotes(e.target.value)}
                  placeholder="e.g. Paid in cash by client"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddIncomeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition"
              >
                Save Income Stream
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- ADD BUDGET MODAL --- */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBudget}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">
                {editingBudgetId ? 'Edit Budget Plan' : 'Setup New Budget Plan'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBudgetModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Budget Plan Name *</label>
                <input
                  type="text"
                  required
                  value={budName}
                  onChange={e => setBudName(e.target.value)}
                  placeholder="e.g. Q1 Marketing & Staffing"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Income Target *</label>
                  <input
                    type="number"
                    required
                    value={budIncomeTarget}
                    onChange={e => setBudIncomeTarget(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold text-emerald-600 dark:text-emerald-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Expense Cap ({currencySymbol}) *</label>
                  <input
                    type="number"
                    required
                    value={budExpenseLimit}
                    onChange={e => setBudExpenseLimit(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold text-[#2563EB] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Savings Goal ({currencySymbol})</label>
                  <input
                    type="number"
                    value={budSavingsTarget}
                    onChange={e => setBudSavingsTarget(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Repayments Goal ({currencySymbol})</label>
                  <input
                    type="number"
                    value={budDebtRepayment}
                    onChange={e => setBudDebtRepayment(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Budget Cycle *</label>
                <select
                  value={budPeriod}
                  onChange={e => setBudPeriod(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddBudgetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-2xs transition"
              >
                Save Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- ADD DEBT LOAN MODAL --- */}
      {showAddLoanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLoan}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">
                {editingLoanId ? 'Modify Debt Ledger Record' : 'Log Lending & Borrowing Entry'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLoanModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Debt Direction *</label>
                <select
                  value={loanType}
                  onChange={e => setLoanType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                >
                  <option value="borrowed">Borrowing (Liabilities Debt)</option>
                  <option value="lent">Lending out (Assets Lent Receivable)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Partner Entity / Lender Name *</label>
                <input
                  type="text"
                  required
                  value={loanPartner}
                  onChange={e => setLoanPartner(e.target.value)}
                  placeholder="e.g. SBA Microloans or Alpha Agency"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Principal ({currencySymbol}) *</label>
                  <input
                    type="number"
                    required
                    value={loanAmt}
                    onChange={e => setLoanAmt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loanInterest}
                    onChange={e => setLoanInterest(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Schedule</label>
                  <select
                    value={loanSchedule}
                    onChange={e => setLoanSchedule(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                  >
                    <option value="monthly">Monthly Installments</option>
                    <option value="one-time">One-time Bullet</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    value={loanDurationMonths}
                    onChange={e => setLoanDurationMonths(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddLoanModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-2xs transition"
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- ISSUE CUSTOMER CREDIT MODAL --- */}
      {showAddCreditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCredit}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">Issue Customer Credit Term</h3>
              <button
                type="button"
                onClick={() => setShowAddCreditModal(false)}
                className="p-1.5 rounded-xl text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Select Customer *</label>
                <select
                  required
                  value={creditCustId}
                  onChange={e => setCreditCustId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.customerNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Invoice Reference ID</label>
                <input
                  type="text"
                  value={creditInvoiceId}
                  onChange={e => setCreditInvoiceId(e.target.value)}
                  placeholder="e.g. INV-2026-081"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Credit Limit Extended ({currencySymbol}) *</label>
                <input
                  type="number"
                  required
                  value={creditAmt}
                  onChange={e => setCreditAmt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-extrabold text-violet-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Agreement Memo / Notes</label>
                <input
                  type="text"
                  value={creditNotes}
                  onChange={e => setCreditNotes(e.target.value)}
                  placeholder="e.g. Approved bulk order custom blazer design terms"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddCreditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-2xs transition"
              >
                Authorize Credit Sale
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- LOG SUPPLIER PAYABLE LIABILITY --- */}
      {showAddPayableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePayable}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">Record Supplier Liability Terms</h3>
              <button
                type="button"
                onClick={() => setShowAddPayableModal(false)}
                className="p-1.5 rounded-xl text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Supplier Partner *</label>
                <select
                  required
                  value={payableSuppId}
                  onChange={e => setPayableSuppId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Purchase Order Reference ID</label>
                <input
                  type="text"
                  value={payablePurchaseId}
                  onChange={e => setPayablePurchaseId(e.target.value)}
                  placeholder="e.g. PO-102 fabric stock"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Balance Owed (Liability Extended) ({currencySymbol}) *</label>
                <input
                  type="number"
                  required
                  value={payableAmt}
                  onChange={e => setPayableAmt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-extrabold text-amber-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Liability Memo / Notes</label>
                <input
                  type="text"
                  value={payableNotes}
                  onChange={e => setPayableNotes(e.target.value)}
                  placeholder="e.g. 30-day term payment for Milano tailoring fabric roll delivery"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddPayableModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition"
              >
                Authorize Liability entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
