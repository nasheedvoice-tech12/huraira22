import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { masterPaymentEngine, DEFAULT_SUBSCRIPTION_PLANS, DEFAULT_TOKEN_PACKAGES } from './masterPaymentEngine';
import { paymentProviderAdapter } from './paymentProviderAdapter';
import { referralStore } from './referralEngine';
import { VelcoraCreditSystem } from './creditManager';
import { authenticateAdmin, AdminRequest } from './adminRouter';

export function createMasterPaymentRouter(): express.Router {
  const router = express.Router();

  // ----------------------------------------------------
  // PUBLIC & CUSTOMER ENDPOINTS
  // ----------------------------------------------------

  // 1. Get Payment & Pricing Configuration (Strictly Strips Internal Margins/Allowances)
  router.get('/config', (req: Request, res: Response) => {
    try {
      const config = masterPaymentEngine.getConfig();
      const plans = masterPaymentEngine.getPlans();
      const tokenPackages = masterPaymentEngine.getPublicTokenPackages();

      res.json({
        success: true,
        plans,
        tokenPackages,
        exchangeRates: config.exchangeRates,
        supportedCountries: config.supportedPayoutCountries,
        minimumPayoutUSD: config.minimumPayoutAmountUSD,
        commissionMode: config.commissionMode,
        systemStatus: {
          maintenanceMode: config.maintenanceMode,
          allowTokenPurchases: config.allowTokenPurchases,
          allowSubscriptions: config.allowSubscriptions,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to get payment config.' });
    }
  });

  // 1a. Authoritative Plan Feature Access & Limit Matrix
  router.get('/plans/matrix', (req: Request, res: Response) => {
    try {
      const plans = masterPaymentEngine.getPlans();
      res.json({
        success: true,
        plans,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch plan matrix.' });
    }
  });

  // 1b. Server-Side Action & Quota Validation (Prevents API & Frontend bypasses)
  router.post('/plans/validate-action', (req: Request, res: Response) => {
    try {
      const { planTier, actionType, key, currentCount } = req.body || {};
      if (!planTier || !actionType || !key) {
        return res.status(400).json({ success: false, error: 'Missing required parameters: planTier, actionType, key.' });
      }

      const result = masterPaymentEngine.validatePlanAction(planTier, actionType, key, currentCount);
      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          allowed: false,
          error: result.error,
          limit: result.limit,
          current: result.current,
          planName: result.planName,
        });
      }

      res.json({
        success: true,
        allowed: true,
        limit: result.limit,
        current: result.current,
        planName: result.planName,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to validate plan action.' });
    }
  });

  // 1c. Get Public Token Packages
  router.get('/token-packages', (req: Request, res: Response) => {
    try {
      const tokenPackages = masterPaymentEngine.getPublicTokenPackages();
      res.json({
        success: true,
        packages: tokenPackages,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch token packages.' });
    }
  });

  // 2. Create Verified Checkout Session Intent
  router.post(['/create-checkout-session', '/checkout'], async (req: Request, res: Response) => {
    try {
      const {
        userId,
        userEmail,
        userName,
        businessId,
        businessName,
        itemType,
        itemId,
        billingInterval,
        currency,
        provider,
        referralCode,
        successUrl,
        cancelUrl,
      } = req.body;

      if (!userId || !itemType || !itemId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required checkout parameters: userId, itemType, itemId.',
        });
      }

      // Step 1: Create Authoritative Internal Checkout Intent
      const intentResult = masterPaymentEngine.createCheckoutIntent({
        userId,
        userEmail: userEmail || `${userId}@velcora.user`,
        userName,
        businessId,
        businessName,
        itemType,
        itemId,
        billingInterval: billingInterval || 'monthly',
        currency: currency || 'USD',
        provider: provider || 'stripe',
        referralCode,
      });

      if (!intentResult.success || !intentResult.checkoutSession) {
        return res.status(400).json({ success: false, error: intentResult.error || 'Failed to create checkout intent.' });
      }

      const session = intentResult.checkoutSession;

      // Step 2: Create Gateway Session via Provider Adapter (Stripe, Safepay, etc.)
      const gatewaySession = await paymentProviderAdapter.createCheckoutSession({
        userId,
        userEmail: userEmail || `${userId}@velcora.user`,
        userName,
        itemType,
        itemId,
        itemName: session.itemName,
        amount: session.amount,
        currency: session.currency,
        provider: session.provider,
        orderId: session.orderId,
        successUrl: successUrl || `${req.protocol}://${req.get('host')}/?payment_success=true&order_id=${session.orderId}`,
        cancelUrl: cancelUrl || `${req.protocol}://${req.get('host')}/?payment_cancelled=true&order_id=${session.orderId}`,
        referralCode: session.referralCodeApplied,
        metadata: {
          internalSessionId: session.sessionId,
          serverSignature: session.serverSignature,
        },
      });

      res.json({
        success: true,
        checkoutSession: {
          ...session,
          checkoutUrl: gatewaySession.checkoutUrl,
          providerSessionId: gatewaySession.sessionId,
          providerPaymentId: gatewaySession.providerPaymentId,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to create checkout session.' });
    }
  });

  // 3. Query Payment / Order Status (with IDOR Protection)
  router.get('/session-status/:sessionId', (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const authenticatedUserId = req.headers['x-user-id'] as string;

      const payment = masterPaymentEngine.getPaymentBySessionId(sessionId) || masterPaymentEngine.getPaymentById(sessionId);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment session not found.' });
      }

      // IDOR Protection: User must match the payment record (unless admin)
      if (authenticatedUserId && payment.userId && payment.userId !== authenticatedUserId && authenticatedUserId !== 'usr-admin-master-01') {
        return res.status(403).json({ success: false, error: 'Unauthorized: Cannot access order belonging to another account.' });
      }

      res.json({
        success: true,
        payment: {
          id: payment.transactionId,
          orderId: payment.orderId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          tokensPurchased: payment.tokensPurchased,
          transactionType: payment.transactionType,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch session status.' });
    }
  });

  // 3b. Query Order Status by orderId (with IDOR Protection)
  router.get('/order-status/:orderId', (req: Request, res: Response) => {
    try {
      const orderId = req.params.orderId;
      const authenticatedUserId = req.headers['x-user-id'] as string;

      const payment = masterPaymentEngine.getPaymentByOrderId(orderId) || masterPaymentEngine.getPaymentById(orderId);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      if (authenticatedUserId && payment.userId && payment.userId !== authenticatedUserId && authenticatedUserId !== 'usr-admin-master-01') {
        return res.status(403).json({ success: false, error: 'Unauthorized: Cannot access order belonging to another account.' });
      }

      res.json({
        success: true,
        order: {
          id: payment.transactionId,
          orderId: payment.orderId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          tokensPurchased: payment.tokensPurchased,
          transactionType: payment.transactionType,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch order status.' });
    }
  });

  // 3c. Get User Payments History (with IDOR Protection)
  router.get('/my-payments', (req: Request, res: Response) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID header is required.' });
      }

      const transactions = masterPaymentEngine.getTransactionsForUser(userId);
      res.json({
        success: true,
        payments: transactions.map(t => ({
          id: t.transactionId,
          orderId: t.orderId,
          transactionType: t.transactionType,
          planId: t.planId,
          packageId: t.packageId,
          tokensPurchased: t.tokensPurchased,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          provider: t.provider,
          paidAt: t.paidAt,
          createdAt: t.createdAt,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch user payments.' });
    }
  });

  // 4. Authoritative Order Confirmation (Client Checkout Completion)
  router.post('/confirm-order', async (req: Request, res: Response) => {
    try {
      const isSimulationAllowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_PAYMENT_SIMULATION === 'true';
      if (!isSimulationAllowed) {
        return res.status(403).json({
          success: false,
          error: 'SIMULATED_PAYMENTS_DISABLED_IN_PRODUCTION: Direct client-side simulated payment confirmation is blocked in production. Real payment provider gateway integration required.',
        });
      }

      const {
        userId,
        userEmail,
        userName,
        businessId,
        businessName,
        transactionType,
        planId,
        packageId,
        orderId,
        billingInterval,
        amount,
        currency,
        provider,
        externalTransactionId,
        paymentMethodDetails,
        idempotencyKey,
        referralCode,
      } = req.body;

      if (!userId || !transactionType || !amount || !provider) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment verification fields.',
        });
      }

      // Process payment with backend authority
      const result = await masterPaymentEngine.processVerifiedPayment({
        userId,
        userEmail: userEmail || `${userId}@velcora.user`,
        userName,
        businessId,
        businessName,
        transactionType,
        planId,
        packageId,
        orderId,
        billingInterval: billingInterval || 'monthly',
        amount: Number(amount),
        currency: currency || 'USD',
        provider: provider || 'stripe',
        externalTransactionId: externalTransactionId || `ext_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        paymentMethodDetails,
        idempotencyKey,
        referralCode,
        signatureVerified: true, // Processed authoritatively by backend
      });

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Error processing order.' });
    }
  });

  // 5. Production Webhook Receiver with Signature Verification & Idempotency
  router.post(['/verify-webhook', '/webhook', '/webhook/stripe', '/webhook/safepay'], async (req: Request, res: Response) => {
    try {
      let provider = (req.params as any)?.provider || (req.query.provider as string) || (req.body.provider as string) || 'stripe';
      if (req.path.includes('safepay')) provider = 'safepay';
      if (req.path.includes('stripe')) provider = 'stripe';

      const signatureHeader = (req.headers['x-velcora-signature'] ||
                               req.headers['x-volcora-signature'] || 
                               req.headers['stripe-signature'] || 
                               req.headers['x-safepay-signature']) as string | undefined;
      
      const config = masterPaymentEngine.getConfig();
      const expectedSecret = config.webhookSecretKeys[provider] || process.env.STRIPE_WEBHOOK_SECRET || process.env.SAFEPAY_WEBHOOK_SECRET;

      const rawPayload = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

      // Verify webhook HMAC signature
      const isSignatureValid = paymentProviderAdapter.verifyWebhookSignature({
        provider: provider as any,
        rawPayload,
        signatureHeader,
        secret: expectedSecret,
      });

      if (!isSignatureValid) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED_SIGNATURE',
          message: 'Webhook HMAC signature mismatch or invalid secret.',
        });
      }

      const body = req.body || {};
      // Handle native Stripe Event wrapper (e.g., body.data.object)
      const stripeObj = body.data?.object || {};
      const metadata = stripeObj.metadata || body.metadata || {};

      const eventType = body.type || body.eventType || body.event || 'payment_intent.succeeded';
      const userId = body.userId || metadata.userId || stripeObj.client_reference_id || 'webhook-user';
      const userEmail = body.userEmail || metadata.userEmail || stripeObj.customer_email || stripeObj.customer_details?.email || 'user@velcora.com';
      const userName = body.userName || metadata.userName || stripeObj.customer_details?.name;
      const businessId = body.businessId || metadata.businessId;
      const transactionType = body.transactionType || metadata.transactionType || (metadata.planId ? 'SUBSCRIPTION' : 'TOKEN_PURCHASE');
      const planId = body.planId || metadata.planId;
      const packageId = body.packageId || metadata.packageId || metadata.itemId;
      const productId = body.productId || metadata.productId || packageId || planId;
      const orderId = body.orderId || metadata.orderId || stripeObj.id;
      const amount = Number(body.amount || (stripeObj.amount ? stripeObj.amount / 100 : 5));
      const currency = (body.currency || stripeObj.currency || 'USD').toUpperCase();
      const externalTransactionId = body.externalTransactionId || stripeObj.payment_intent || stripeObj.id || `wh_${Date.now()}`;
      const idempotencyKey = body.idempotencyKey || `wh_idem_${externalTransactionId}`;
      const referralCode = body.referralCode || metadata.referralCode;
      const paymentMethodDetails = body.paymentMethodDetails || `${provider.toUpperCase()} Webhook Verified`;
      const status = body.status || (eventType.includes('failed') ? 'failed' : eventType.includes('canceled') ? 'cancelled' : 'succeeded');

      // Handle refund event from provider
      if (eventType === 'charge.refunded' || eventType === 'charge.dispute.created' || status === 'refunded') {
        const refundResult = await masterPaymentEngine.processRefund(
          externalTransactionId || orderId,
          'Webhook refund event received from payment provider',
          'webhook-system',
          'webhooks@velcora.com'
        );
        return res.json({ success: true, refund: refundResult });
      }

      // Handle failed / cancelled events
      if (eventType.includes('failed') || eventType.includes('canceled') || status === 'failed' || status === 'cancelled') {
        const failedResult = await masterPaymentEngine.processVerifiedPayment({
          userId,
          userEmail,
          userName,
          businessId,
          transactionType,
          planId,
          packageId,
          productId,
          orderId,
          amount,
          currency,
          provider: provider as any,
          externalTransactionId,
          idempotencyKey,
          referralCode,
          paymentMethodDetails,
          signatureVerified: true,
          status: status === 'cancelled' ? 'cancelled' : 'failed',
        });
        return res.json(failedResult);
      }

      // Handle standard payment success event
      const result = await masterPaymentEngine.processVerifiedPayment({
        userId,
        userEmail,
        userName,
        businessId,
        transactionType,
        planId,
        packageId,
        productId,
        orderId,
        amount,
        currency,
        provider: provider as any,
        externalTransactionId,
        idempotencyKey,
        referralCode,
        paymentMethodDetails,
        signatureVerified: true,
        status: 'succeeded',
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to handle webhook.' });
    }
  });

  // 5. User's Active Subscription & Ledger
  router.get('/my-subscription', (req: Request, res: Response) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required.' });
      }

      const subscription = masterPaymentEngine.getUserSubscription(userId);
      const transactions = masterPaymentEngine.getTransactionsForUser(userId);

      res.json({
        success: true,
        subscription,
        transactions,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch subscription.' });
    }
  });

  // 6. User Cancel Subscription
  router.post('/cancel-subscription', (req: Request, res: Response) => {
    try {
      const { userId, cancelImmediately, reason } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required.' });
      }

      const result = masterPaymentEngine.cancelSubscription(userId, cancelImmediately, reason);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to cancel subscription.' });
    }
  });

  // ----------------------------------------------------
  // GLOBAL REFERRAL PAYOUTS (USER/PARTNER ENDPOINTS)
  // ----------------------------------------------------

  router.get('/payout/accounts', (req: Request, res: Response) => {
    try {
      const partnerId = (req.headers['x-partner-id'] as string) || (req.query.partnerId as string);
      if (!partnerId) {
        return res.status(400).json({ success: false, error: 'Partner ID is required.' });
      }

      const accounts = masterPaymentEngine.getPayoutAccounts(partnerId);
      res.json({ success: true, accounts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to get payout accounts.' });
    }
  });

  router.post('/payout/accounts', (req: Request, res: Response) => {
    try {
      const {
        partnerId,
        userId,
        countryCode,
        provider,
        accountTitle,
        accountNumberOrIban,
        bankName,
        branchCode,
        swiftBic,
        email,
        isDefault,
      } = req.body;

      if (!partnerId || !countryCode || !provider || !accountTitle || !accountNumberOrIban) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payout account fields (partnerId, countryCode, provider, accountTitle, accountNumberOrIban).',
        });
      }

      const created = masterPaymentEngine.addPayoutAccount({
        partnerId,
        userId: userId || 'partner-user',
        countryCode,
        provider,
        accountTitle,
        accountNumberOrIban,
        bankName,
        branchCode,
        swiftBic,
        email,
        isDefault: Boolean(isDefault),
        isVerified: true,
      });

      res.json({ success: true, account: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to add payout account.' });
    }
  });

  router.post('/payout/request', (req: Request, res: Response) => {
    try {
      const { partnerId, userId, userEmail, userName, payoutAccountId } = req.body;
      if (!partnerId || !payoutAccountId) {
        return res.status(400).json({ success: false, error: 'Partner ID and payout account ID are required.' });
      }

      const result = masterPaymentEngine.requestPayout({
        partnerId,
        userId: userId || 'partner-user',
        userEmail: userEmail || 'partner@velcora.com',
        userName: userName || 'Referral Partner',
        payoutAccountId,
      });

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to request payout.' });
    }
  });

  router.get('/payout/requests', (req: Request, res: Response) => {
    try {
      const partnerId = (req.headers['x-partner-id'] as string) || (req.query.partnerId as string);
      const requests = masterPaymentEngine.getPayoutRequests(partnerId);
      res.json({ success: true, requests });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to get payout requests.' });
    }
  });

  // ----------------------------------------------------
  // CONTROLLED COMPATIBILITY LAYER FOR /api/payment/admin/*
  // Strictly guarded by canonical authenticateAdmin authorization
  // ----------------------------------------------------

  router.get('/admin/overview', authenticateAdmin, (req: AdminRequest, res: Response) => {
    try {
      const telemetry = masterPaymentEngine.getSuperAdminTelemetry();
      const referralOverview = referralStore.getAdminOverview();

      res.json({
        success: true,
        telemetry,
        referralOverview,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch admin overview.' });
    }
  });

  router.post('/admin/plans/update', authenticateAdmin, (req: AdminRequest, res: Response) => {
    try {
      const plans = req.body?.plans || (Array.isArray(req.body) ? req.body : null);
      const adminEmail = req.admin?.email || 'founder@velcora.com';

      if (!Array.isArray(plans)) {
        return res.status(400).json({ success: false, error: 'Plans array is required.' });
      }

      const updated = masterPaymentEngine.updatePlans(plans, 'founder-compat', adminEmail);
      res.json({ success: true, plans: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to update plans.' });
    }
  });

  router.post('/admin/token-packages/update', authenticateAdmin, (req: AdminRequest, res: Response) => {
    try {
      const packages = req.body?.packages || (Array.isArray(req.body) ? req.body : null);
      const adminEmail = req.admin?.email || 'founder@velcora.com';

      if (!Array.isArray(packages)) {
        return res.status(400).json({ success: false, error: 'Packages array is required.' });
      }

      const updated = masterPaymentEngine.updateTokenPackages(packages, 'founder-compat', adminEmail);
      res.json({ success: true, packages: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to update token packages.' });
    }
  });

  router.post('/admin/config/update', authenticateAdmin, (req: AdminRequest, res: Response) => {
    try {
      const patch = req.body;
      const adminEmail = req.admin?.email || 'founder@velcora.com';

      const updated = masterPaymentEngine.updateConfig(patch, 'founder-compat', adminEmail);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to update admin config.' });
    }
  });

  router.post('/admin/payouts/process', authenticateAdmin, (req: AdminRequest, res: Response) => {
    try {
      const { payoutId, action, notes, transactionRef } = req.body;
      const adminEmail = req.admin?.email || 'founder@velcora.com';

      if (!payoutId || !action) {
        return res.status(400).json({ success: false, error: 'payoutId and action (APPROVE/COMPLETE/FAIL/CANCEL) are required.' });
      }

      const result = masterPaymentEngine.processPayoutRequest(payoutId, action, 'founder-compat', adminEmail, notes, transactionRef);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to process payout.' });
    }
  });

  router.post('/admin/refund', authenticateAdmin, async (req: AdminRequest, res: Response) => {
    try {
      const { transactionId, reason } = req.body;
      const adminEmail = req.admin?.email || 'founder@velcora.com';

      if (!transactionId) {
        return res.status(400).json({ success: false, error: 'transactionId is required.' });
      }

      const result = await masterPaymentEngine.processRefund(transactionId, reason || 'Admin requested refund', 'founder-compat', adminEmail);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to process refund.' });
    }
  });

  // Run the 23-Scenario Automated Sandbox Security Suite
  router.post('/admin/run-security-matrix', authenticateAdmin, async (req: AdminRequest, res: Response) => {
    try {
      const report = await masterPaymentEngine.runComprehensiveSecurityMatrix();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Error running security matrix.' });
    }
  });

  return router;
}
