import React, { useState, useEffect } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  SubscriptionPlanConfig,
  TokenPackageConfig,
  PaymentGatewayProvider,
} from '../types';
import { DEFAULT_SUBSCRIPTION_PLANS, DEFAULT_TOKEN_PACKAGES } from '../data/paymentPlans';
import {
  X,
  CheckCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  CreditCard,
  Building,
  Smartphone,
  Globe,
  Tag,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';

export const MasterCheckoutModal: React.FC = () => {
  const {
    isCheckoutModalOpen,
    checkoutInitialTab,
    checkoutSelectedPlanId,
    checkoutSelectedPackageId,
    closeCheckoutModal,
    subscriptionPlans,
    tokenPackages,
    activeSubscription,
    initiateCheckoutSession,
    confirmOrderPayment,
    activeReferralCode,
    validateReferralCode,
    applyReferralCode,
    activeUser,
    activeBusiness,
  } = useVelcora();

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'tokens'>(checkoutInitialTab || 'subscriptions');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'PKR' | 'EUR' | 'GBP' | 'AED' | 'SAR'>('USD');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(checkoutSelectedPlanId || 'tier_pro');
  const [selectedPackageId, setSelectedPackageId] = useState<string>(checkoutSelectedPackageId || 'token_pack_20usd');
  const [selectedProvider, setSelectedProvider] = useState<PaymentGatewayProvider>('stripe');
  
  const [referralInput, setReferralInput] = useState<string>(activeReferralCode || '');
  const [referralValidationMsg, setReferralValidationMsg] = useState<{ valid?: boolean; text: string } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    transactionId: string;
    itemTitle: string;
    amountPaid: string;
    tokensCredited?: number;
    receiptMessage: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial selections
  useEffect(() => {
    if (isCheckoutModalOpen) {
      setActiveTab(checkoutInitialTab || 'subscriptions');
      if (checkoutSelectedPlanId) setSelectedPlanId(checkoutSelectedPlanId);
      if (checkoutSelectedPackageId) setSelectedPackageId(checkoutSelectedPackageId);
      setPaymentSuccessData(null);
      setErrorMessage(null);
      if (activeReferralCode) {
        setReferralInput(activeReferralCode);
        setReferralValidationMsg({ valid: true, text: `Partner referral code ${activeReferralCode} active.` });
      }
    }
  }, [isCheckoutModalOpen, checkoutInitialTab, checkoutSelectedPlanId, checkoutSelectedPackageId, activeReferralCode]);

  if (!isCheckoutModalOpen) return null;

  const availablePlans = (subscriptionPlans && subscriptionPlans.length > 0) ? subscriptionPlans : DEFAULT_SUBSCRIPTION_PLANS;
  const availablePackages = (tokenPackages && tokenPackages.length > 0) ? tokenPackages : DEFAULT_TOKEN_PACKAGES;

  const currentPlan = availablePlans.find(p => p.id === selectedPlanId) || availablePlans[1] || availablePlans[0];
  const currentPackage = availablePackages.find(p => p.id === selectedPackageId) || availablePackages[1] || availablePackages[0];

  // Price Calculation
  const calculatePlanPrice = (plan: SubscriptionPlanConfig) => {
    if (selectedCurrency === 'USD') {
      return billingInterval === 'annual' ? plan.annualPriceUSD : plan.monthlyPriceUSD;
    }
    if (plan.currencyPricing && plan.currencyPricing[selectedCurrency]) {
      return billingInterval === 'annual'
        ? plan.currencyPricing[selectedCurrency].annual
        : plan.currencyPricing[selectedCurrency].monthly;
    }
    return billingInterval === 'annual' ? plan.annualPriceUSD : plan.monthlyPriceUSD;
  };

  const calculatePackagePrice = (pkg: TokenPackageConfig) => {
    if (selectedCurrency === 'USD') return pkg.priceUSD;
    if (pkg.currencyPricing && pkg.currencyPricing[selectedCurrency]) {
      return pkg.currencyPricing[selectedCurrency];
    }
    return pkg.priceUSD;
  };

  const handleValidateReferralCode = async () => {
    if (!referralInput.trim()) {
      setReferralValidationMsg(null);
      return;
    }
    setIsValidatingCode(true);
    try {
      const res = await validateReferralCode(referralInput.trim().toUpperCase());
      if (res.valid) {
        await applyReferralCode(res.code || referralInput.trim());
        setReferralValidationMsg({ valid: true, text: `Valid code: ${res.code}. Commission will be credited to partner.` });
      } else {
        setReferralValidationMsg({ valid: false, text: res.message || 'Invalid or non-existent referral code.' });
      }
    } catch {
      setReferralValidationMsg({ valid: false, text: 'Could not verify code.' });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleExecutePayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (activeTab === 'subscriptions') {
        const price = calculatePlanPrice(currentPlan);

        // Step 1: Create session intent on authoritative backend
        const sessionRes = await initiateCheckoutSession({
          itemType: 'SUBSCRIPTION',
          itemId: currentPlan.id,
          billingInterval,
          currency: selectedCurrency,
          provider: selectedProvider,
          referralCode: referralInput.trim().toUpperCase() || activeReferralCode || undefined,
        });

        if (!sessionRes.success) {
          throw new Error(sessionRes.error || 'Failed to initialize secure checkout session.');
        }

        // Step 2: Confirm order through authoritative backend
        const res = await confirmOrderPayment({
          transactionType: 'SUBSCRIPTION',
          planId: currentPlan.id,
          billingInterval,
          amount: price,
          currency: selectedCurrency,
          provider: selectedProvider,
          paymentMethodDetails: `${selectedProvider.toUpperCase()} Authoritative Payment Gateway`,
          referralCode: referralInput.trim().toUpperCase() || activeReferralCode || undefined,
        });

        if (res.success) {
          setPaymentSuccessData({
            transactionId: res.transaction?.transactionId || sessionRes.session?.orderId || `tx_${Date.now()}`,
            itemTitle: `${currentPlan.name} (${billingInterval === 'annual' ? 'Annual Plan' : 'Monthly Plan'})`,
            amountPaid: `${selectedCurrency} ${price.toLocaleString()}`,
            tokensCredited: currentPlan.tokensIncludedMonthly,
            receiptMessage: `Your ${currentPlan.name} subscription is now active! ${currentPlan.tokensIncludedMonthly.toLocaleString()} AI tokens have been credited to your wallet.`,
          });
        } else {
          setErrorMessage(res.error || 'Failed to complete subscription payment.');
        }
      } else {
        // TOKEN PURCHASE
        const price = calculatePackagePrice(currentPackage);

        // Step 1: Create session intent on authoritative backend
        const sessionRes = await initiateCheckoutSession({
          itemType: 'TOKEN_PURCHASE',
          itemId: currentPackage.id,
          currency: selectedCurrency,
          provider: selectedProvider,
          referralCode: referralInput.trim().toUpperCase() || activeReferralCode || undefined,
        });

        if (!sessionRes.success) {
          throw new Error(sessionRes.error || 'Failed to initialize secure checkout session.');
        }

        // Step 2: Confirm order through authoritative backend
        const res = await confirmOrderPayment({
          transactionType: 'TOKEN_PURCHASE',
          packageId: currentPackage.id,
          amount: price,
          currency: selectedCurrency,
          provider: selectedProvider,
          paymentMethodDetails: `${selectedProvider.toUpperCase()} Authoritative Token Gateway`,
          referralCode: referralInput.trim().toUpperCase() || activeReferralCode || undefined,
        });

        if (res.success) {
          const totalTokens = currentPackage.tokens + currentPackage.bonusTokens;
          setPaymentSuccessData({
            transactionId: res.transaction?.transactionId || sessionRes.session?.orderId || `tx_${Date.now()}`,
            itemTitle: `${currentPackage.name} (${totalTokens.toLocaleString()} Tokens)`,
            amountPaid: `${selectedCurrency} ${price.toLocaleString()}`,
            tokensCredited: totalTokens,
            receiptMessage: `Successfully credited ${totalTokens.toLocaleString()} tokens to your Velcora AI wallet. Strict policy: $0.00 referral commission generated on token purchases.`,
          });
        } else {
          setErrorMessage(res.error || 'Failed to complete token purchase.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment processing error.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Velcora Payment & Billing Portal
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  Secure Checkout
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Cloud subscriptions, AI token packages & multi-currency billing
              </p>
            </div>
          </div>
          <button
            onClick={closeCheckoutModal}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {paymentSuccessData ? (
          /* Success Screen */
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">Payment Confirmed & Verified!</h3>
            <p className="max-w-md text-sm text-slate-300">
              {paymentSuccessData.receiptMessage}
            </p>

            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-4 text-left space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="font-mono text-slate-200">{paymentSuccessData.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Item Purchased:</span>
                <span className="font-semibold text-slate-200">{paymentSuccessData.itemTitle}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount Paid:</span>
                <span className="font-semibold text-emerald-400">{paymentSuccessData.amountPaid}</span>
              </div>
              {paymentSuccessData.tokensCredited ? (
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span>AI Tokens Credited:</span>
                  <span className="font-bold text-amber-400">+{paymentSuccessData.tokensCredited.toLocaleString()} Tokens</span>
                </div>
              ) : null}
            </div>

            <button
              onClick={closeCheckoutModal}
              className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          /* Checkout Body */
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-6">

            {/* Navigation Tabs & Currency Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                    activeTab === 'subscriptions'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Velcora Subscriptions
                </button>
                <button
                  onClick={() => setActiveTab('tokens')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                    activeTab === 'tokens'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  AI Token Packages
                  <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-amber-200">0% Commission</span>
                </button>
              </div>

              {/* Currency Selector */}
              <div className="flex items-center gap-2 text-xs">
                <Globe className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400">Currency:</span>
                <select
                  value={selectedCurrency}
                  onChange={(e: any) => setSelectedCurrency(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="PKR">PKR (Rs.)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SAR">SAR (﷼)</option>
                </select>
              </div>
            </div>

            {/* TAB 1: SUBSCRIPTIONS */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-4">
                {/* Billing Interval Toggle */}
                <div className="flex items-center justify-center gap-3">
                  <span className={`text-xs font-semibold ${billingInterval === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
                    Monthly Billing
                  </span>
                  <button
                    onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'annual' : 'monthly')}
                    className={`relative h-6 w-11 rounded-full transition ${billingInterval === 'annual' ? 'bg-indigo-600' : 'bg-slate-700'}`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        billingInterval === 'annual' ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingInterval === 'annual' ? 'text-white' : 'text-slate-400'}`}>
                    Annual Billing
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      2 Months Free
                    </span>
                  </span>
                </div>

                {/* Subscription Plans Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availablePlans.map((plan) => {
                    const price = calculatePlanPrice(plan);
                    const isSelected = selectedPlanId === plan.id;
                    const isCurrent = activeSubscription?.planId === plan.id && activeSubscription?.status === 'active';

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-600/10'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                        }`}
                      >
                        {plan.isPopular && (
                          <div className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                            Most Popular
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute -top-2.5 left-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-slate-950 shadow">
                            Current Plan
                          </div>
                        )}

                        <div>
                          <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{plan.tagline}</p>

                          <div className="my-3">
                            <span className="text-2xl font-black text-white">
                              {selectedCurrency === 'USD' ? '$' : selectedCurrency + ' '}
                              {price.toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400">/{billingInterval === 'annual' ? 'yr' : 'mo'}</span>
                          </div>

                          <div className="rounded-lg bg-slate-900 p-2 text-xs space-y-1 mb-3 border border-slate-800/80">
                            <div className="flex justify-between text-slate-300">
                              <span>Monthly AI Tokens:</span>
                              <span className="font-bold text-amber-400">{plan.tokensIncludedMonthly.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Workstations:</span>
                              <span>{plan.maxWorkstations === 999 ? 'Unlimited' : plan.maxWorkstations}</span>
                            </div>
                          </div>

                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {plan.features.slice(0, 4).map((f, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                                <span className="line-clamp-1">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800">
                          <button
                            type="button"
                            className={`w-full rounded-lg py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select Plan'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-300 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-indigo-400" />
                  <span>
                    Subscription purchases are <strong>100% eligible for Global Referral Commission</strong>. Partners earn standard recurring rewards on plan activations.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: AI TOKEN PACKAGES */}
            {activeTab === 'tokens' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
                    <span>
                      <strong>STRICT POLICY:</strong> Token packages add direct high-speed AI processing credits to your Velcora Brain and generate <strong>ZERO ($0.00) referral commission</strong>.
                    </span>
                  </div>
                </div>

                {/* Token Packages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availablePackages.map((pkg) => {
                    const price = calculatePackagePrice(pkg);
                    const isSelected = selectedPackageId === pkg.id;
                    const totalTokens = pkg.tokens + pkg.bonusTokens;

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-950/20 shadow-lg shadow-amber-600/10'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                        }`}
                      >
                        {pkg.badge && (
                          <div className="absolute -top-2.5 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-slate-950 shadow">
                            {pkg.badge}
                          </div>
                        )}

                        <div>
                          <h3 className="text-xs font-bold text-white">{pkg.name}</h3>
                          <div className="my-2">
                            <span className="text-xl font-black text-amber-400">
                              {totalTokens.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 block">AI Tokens</span>
                          </div>

                          {pkg.bonusTokens > 0 && (
                            <div className="inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 mb-2">
                              +{pkg.bonusTokens.toLocaleString()} Bonus Included
                            </div>
                          )}

                          <div className="text-lg font-bold text-white">
                            {selectedCurrency === 'USD' ? '$' : selectedCurrency + ' '}
                            {price.toLocaleString()}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            className={`w-full rounded-lg py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select Pack'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unified Secure Checkout & Referral Code Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              
              {/* Enterprise Security & Instant Provisioning Guarantee */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/20 flex flex-col justify-between space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Secure Cloud Activation</h4>
                    <p className="text-[10px] text-slate-400">TLS-secured checkout with immediate quota sync</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                  <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Zero setup fees • Automatic wallet credit</span>
                </div>
              </div>

              {/* Referral Code Application */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Have a Partner Referral Code?</span>
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                    placeholder="e.g. VEL453821"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleValidateReferralCode}
                    disabled={isValidatingCode}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                  >
                    {isValidatingCode ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                  </button>
                </div>

                {referralValidationMsg && (
                  <p className={`text-[11px] ${referralValidationMsg.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {referralValidationMsg.text}
                  </p>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!paymentSuccessData && (
          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-4">
            <div className="text-xs text-slate-400">
              {activeTab === 'subscriptions' ? (
                <span>
                  Total Due: <strong className="text-white font-mono text-sm">{selectedCurrency} {calculatePlanPrice(currentPlan).toLocaleString()}</strong>
                </span>
              ) : (
                <span>
                  Total Due: <strong className="text-amber-400 font-mono text-sm">{selectedCurrency} {calculatePackagePrice(currentPackage).toLocaleString()}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeCheckoutModal}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isProcessing}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white transition shadow-lg ${
                  activeTab === 'subscriptions'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    Confirm & Complete Checkout
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
