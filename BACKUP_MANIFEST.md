# VELCORA PROJECT BACKUP MANIFEST
**Preserved Location:** `Desktop/GitHub/VELCORA`  
**Total Source Files Preserved:** 196+ files across 68+ directories  
**Exclusions:** Transient artifacts (`node_modules`, `dist`, `.firebase`)

---

## Directory Inventory

### `src/` — Application Source Code
* `src/App.tsx` — Main application shell, routing, standalone `/admin` guard, receipt URL parser.
* `src/main.tsx` — React 18 DOM mount point.
* `src/index.css` — Tailwind styling with dark/light themes, custom animations, custom scrollbars.
* `src/types.ts` — 1,170+ lines of complete TypeScript definitions across all business entities.

### `src/components/` — 42 React Feature Components
* `PosBillingScreen.tsx` — Complete POS billing interface, barcode scanner, cart calculations, fast-item grid.
* `MasterCheckoutModal.tsx` — Universal payment modal supporting cash, card, crypto, split payments.
* `ProductCatalog.tsx` — Product catalog, variant management, service appointment editor.
* `FounderAdminPanel.tsx` — Enterprise Founder Admin Control Center.
* `AdminAnalyticsView.tsx` — SuperAdmin Telemetry Suite and analytics engine.
* `BusinessBrainView.tsx` — Business intelligence dashboard, live orders table, sales charts.
* `AskVelcoraChat.tsx` — Multi-modal conversational AI assistant.
* `VelcoraVoiceHudModal.tsx` — Voice-activated heads-up navigation modal.
* `AiDemandForecaster.tsx` — Predictive inventory stocking forecaster.
* `AiRouterView.tsx` — Multi-provider AI model router.
* `DigitalReceiptView.tsx` — Cryptographic receipt renderer and printable invoice.
* `FinancialManagement.tsx` — Accounting, cash flow, profit/loss, ledger records.
* `PaymentRecordsView.tsx` — Transaction audit history and refund tracker.
* `CustomerAndLoyalty.tsx` — Loyalty points, digital customer cards, customer CRM.
* `SubuserManagement.tsx` — Staff member accounts, role-based access control, POS PIN codes.
* `TaxManagementView.tsx` — Multi-regional tax rates and VAT policies.
* `CloudAndSettings.tsx` — Business settings, hardware peripherals, backup/restore.
* `OnboardingWizardModal.tsx` — New merchant setup walkthrough.
* `ReferralPartnerDashboard.tsx` — Integrated affiliate partner console.

### `src/server/` — Backend Routers & Engines
* `masterPaymentEngine.ts` — Payment processing, token balance deductions, plan upgrades.
* `masterPaymentRouter.ts` — REST API endpoints for checkout transactions.
* `adminRouter.ts` — SuperAdmin administrative endpoints.
* `creditManager.ts` — Token credit ledger and prepaid balance controller.
* `referralEngine.ts` — Commission calculations and affiliate code resolution.
* `referralRouter.ts` — Partner endpoints.
* `staffAuth.ts` — POS PIN authentication and session tokens.
* `concurrencyEngine.ts` — Lock management for inventory updates.

### `src/lib/` & `src/utils/` — Infrastructure & Services
* `firebase.ts` — Production Firebase SDK initialization (`auth`, `db`, `storage`).
* `supabase.ts` — Supabase client adapter.
* `planLimitsEngine.ts` — Live subscription limits and feature matrix evaluation.
* `translations.ts` — 9-language translation dictionary.
* `receiptPrinter.ts` — Thermal receipt layout and browser print driver.
* `barcodeGenerator.ts` — Code128 barcode generator.

### `second brain/` — Second Brain Knowledge Subsystem
* `second brain/src/` — Ingestion, memory, reasoning, relationship graph, and retrieval engines.
* `second brain/wiki/` — Decision records and entity knowledge markdown files.
* `second brain/schemas/` — JSON schemas for memory, entities, events, relationships.

### `tests/` — Automated Test Suite
* `tests/run-all-tests.ts` — Master test runner.
* `tests/admin-security-audit.test.ts` — SuperAdmin security matrix tests.
* `tests/financial-pricing.test.ts` — Pricing, tax, and currency test scenarios.
* `tests/inventory-concurrency.test.ts` — Simultaneous transaction race condition tests.
* `tests/loyalty-promotions.test.ts` — Promotional rule tests.
* `tests/security-multi-tenant.test.ts` — Tenant isolation validation.
