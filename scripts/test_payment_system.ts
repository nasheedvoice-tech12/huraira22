import { masterPaymentEngine, DEFAULT_TOKEN_PACKAGES } from '../src/server/masterPaymentEngine';
import { paymentProviderAdapter } from '../src/server/paymentProviderAdapter';
import { VelcoraCreditSystem } from '../src/server/creditManager';
import { referralStore } from '../src/server/referralEngine';
import crypto from 'crypto';

async function runPaymentSystemTests() {
  console.log('=== RUNNING VOLCORA AUTHORITATIVE PAYMENT & WEBHOOK SYSTEM AUDIT TESTS ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: TOKEN PACKS PRICING & MARGINS
  // ----------------------------------------------------
  const packages = masterPaymentEngine.getTokenPackages();
  const pack5 = packages.find(p => p.priceUSD === 5);
  const pack20 = packages.find(p => p.priceUSD === 20);
  const pack60 = packages.find(p => p.priceUSD === 60);

  assert(!!pack5 && pack5.tokens === 25000 && pack5.internalAllowanceUSD === 3.0, 'Test 1: $5 Starter Pack (25k tokens, $3 internal allowance)');
  assert(!!pack20 && pack20.tokens === 120000 && pack20.internalAllowanceUSD === 12.0, 'Test 2: $20 Growth Pack (120k tokens, $12 internal allowance)');
  assert(!!pack60 && pack60.tokens === 400000 && pack60.internalAllowanceUSD === 36.0, 'Test 3: $60 Enterprise Pack (400k tokens, $36 internal allowance)');

  // Public package endpoint strips internal allowance
  const publicPacks = masterPaymentEngine.getPublicTokenPackages();
  const hasAllowanceExposed = publicPacks.some(p => (p as any).internalAllowanceUSD !== undefined);
  assert(!hasAllowanceExposed, 'Test 4: Internal margin & API allowance stripped from public view');

  // ----------------------------------------------------
  // TEST GROUP 2: CHECKOUT SESSION & SIGNATURE
  // ----------------------------------------------------
  const testUserId = `test_user_${Date.now()}`;
  const checkoutIntent = masterPaymentEngine.createCheckoutIntent({
    userId: testUserId,
    userEmail: 'test@volcora.com',
    itemType: 'TOKEN_PURCHASE',
    itemId: 'token_pack_5usd',
    currency: 'USD',
    provider: 'stripe',
  });

  assert(checkoutIntent.success && !!checkoutIntent.checkoutSession?.serverSignature && !!checkoutIntent.checkoutSession?.orderId, 'Test 5: Checkout intent creation with server signature & order ID');

  // Initial Wallet Balance
  const initialWallet = await VelcoraCreditSystem.getWallet(testUserId);
  const initialBalance = initialWallet.availableCredits;

  // ----------------------------------------------------
  // TEST GROUP 3: SUCCESSFUL PAYMENT PROCESSING
  // ----------------------------------------------------
  const extTxId = `test_ext_${Date.now()}`;
  const payResult = await masterPaymentEngine.processVerifiedPayment({
    userId: testUserId,
    userEmail: 'test@volcora.com',
    transactionType: 'TOKEN_PURCHASE',
    packageId: 'token_pack_5usd',
    amount: 5.0,
    currency: 'USD',
    provider: 'stripe',
    externalTransactionId: extTxId,
    idempotencyKey: `idem_${extTxId}`,
    referralCode: 'VIPREF123',
    signatureVerified: true,
    status: 'succeeded',
  });

  assert(payResult.success && payResult.tokensCredited === 25000, 'Test 6: Succeeded payment credits exact 25,000 tokens');
  assert(!payResult.commissionRecord && payResult.transaction?.commissionEligible === false, 'Test 7: Token package strictly generated $0.00 referral commission');

  const updatedWallet = await VelcoraCreditSystem.getWallet(testUserId);
  assert(updatedWallet.availableCredits === initialBalance + 25000, 'Test 8: Wallet balance increased by 25,000 credits');

  // ----------------------------------------------------
  // TEST GROUP 4: IDEMPOTENCY & DUPLICATE PREVENTION
  // ----------------------------------------------------
  const dupResult = await masterPaymentEngine.processVerifiedPayment({
    userId: testUserId,
    userEmail: 'test@volcora.com',
    transactionType: 'TOKEN_PURCHASE',
    packageId: 'token_pack_5usd',
    amount: 5.0,
    currency: 'USD',
    provider: 'stripe',
    externalTransactionId: extTxId,
    idempotencyKey: `idem_${extTxId}`,
    signatureVerified: true,
    status: 'succeeded',
  });

  const dupWallet = await VelcoraCreditSystem.getWallet(testUserId);
  assert(dupResult.success && dupWallet.availableCredits === updatedWallet.availableCredits, 'Test 9: Duplicate payment idempotency rejected duplicate credit additions');

  // ----------------------------------------------------
  // TEST GROUP 5: FAILURE & TAMPERING STATES
  // ----------------------------------------------------
  const failTxId = `test_fail_${Date.now()}`;
  const failResult = await masterPaymentEngine.processVerifiedPayment({
    userId: testUserId,
    userEmail: 'test@volcora.com',
    transactionType: 'TOKEN_PURCHASE',
    packageId: 'token_pack_5usd',
    amount: 5.0,
    currency: 'USD',
    provider: 'stripe',
    externalTransactionId: failTxId,
    signatureVerified: true,
    status: 'failed',
  });

  const walletAfterFail = await VelcoraCreditSystem.getWallet(testUserId);
  assert(!failResult.success && failResult.tokensCredited === 0 && walletAfterFail.availableCredits === updatedWallet.availableCredits, 'Test 10: Failed payment status correctly granted 0 tokens');

  // Price underpayment / tampering check
  const tamperedResult = await masterPaymentEngine.processVerifiedPayment({
    userId: testUserId,
    userEmail: 'test@volcora.com',
    transactionType: 'TOKEN_PURCHASE',
    packageId: 'token_pack_60usd',
    amount: 1.0, // Attempted tampering: $1 for a $60 pack
    currency: 'USD',
    provider: 'stripe',
    externalTransactionId: `tamper_${Date.now()}`,
    signatureVerified: true,
    status: 'succeeded',
  });
  assert(!tamperedResult.success && (!tamperedResult.tokensCredited || tamperedResult.tokensCredited === 0), 'Test 11: Underpaid / tampered price rejected without crediting tokens');

  // ----------------------------------------------------
  // TEST GROUP 6: WEBHOOK HMAC SIGNATURE VERIFICATION
  // ----------------------------------------------------
  const testSecret = 'whsec_test_secret_key_12345';
  const testPayload = JSON.stringify({
    eventType: 'payment_intent.succeeded',
    userId: testUserId,
    amount: 5.0,
    currency: 'USD',
  });
  const validSignature = crypto.createHmac('sha256', testSecret).update(testPayload).digest('hex');

  const validSigCheck = paymentProviderAdapter.verifyWebhookSignature({
    provider: 'stripe',
    rawPayload: testPayload,
    signatureHeader: validSignature,
    secret: testSecret,
  });

  const invalidSigCheck = paymentProviderAdapter.verifyWebhookSignature({
    provider: 'stripe',
    rawPayload: testPayload,
    signatureHeader: 'tampered_signature_header_value',
    secret: testSecret,
  });

  assert(validSigCheck === true, 'Test 12: Valid webhook HMAC signature verification succeeded');
  assert(invalidSigCheck === false, 'Test 13: Invalid / forged webhook HMAC signature rejected');

  // ----------------------------------------------------
  // TEST GROUP 7: REFUNDS & BALANCE REVERSAL
  // ----------------------------------------------------
  const refundResult = await masterPaymentEngine.processRefund(
    payResult.transaction!.transactionId,
    'Customer requested refund test',
    'admin_test',
    'admin@volcora.com'
  );

  const walletAfterRefund = await VelcoraCreditSystem.getWallet(testUserId);
  assert(refundResult.success && walletAfterRefund.availableCredits === initialBalance, 'Test 14: Refund transaction deducted credited tokens back to initial balance');

  // ----------------------------------------------------
  // TEST GROUP 8: SUBSCRIPTIONS & ATTRIBUTION
  // ----------------------------------------------------
  const subUserId = `sub_user_${Date.now()}`;
  const subTxId = `sub_tx_${Date.now()}`;
  const subResult = await masterPaymentEngine.processVerifiedPayment({
    userId: subUserId,
    userEmail: 'subscriber@volcora.com',
    transactionType: 'SUBSCRIPTION',
    planId: 'tier_pro',
    amount: 10.0,
    currency: 'USD',
    provider: 'stripe',
    externalTransactionId: subTxId,
    referralCode: 'FOUNDER50',
    signatureVerified: true,
    status: 'succeeded',
  });

  assert(subResult.success && subResult.subscription?.tier === 'pro' && subResult.tokensCredited === 10000, 'Test 15: Subscription purchase upgraded user to Pro and granted monthly tokens');

  // ----------------------------------------------------
  // TEST GROUP 9: TRANSACTION QUERY BY ORDER ID
  // ----------------------------------------------------
  const retrievedTx = masterPaymentEngine.getPaymentById(payResult.transaction!.transactionId);
  assert(!!retrievedTx && retrievedTx.status === 'refunded', 'Test 16: Transaction retrieved by ID with updated refunded status');

  console.log(`\n======================================================`);
  console.log(`PAYMENT & WEBHOOK TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log(`======================================================\n`);
  
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPaymentSystemTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
