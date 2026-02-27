# DealGapIQ Mobile — Testing Checklist

## IAP Sandbox Testing

### Apple Sandbox (iOS)

- [ ] Create sandbox tester in App Store Connect (Settings → Sandbox → Testers)
- [ ] Sign out of production Apple ID on device (Settings → Media & Purchases)
- [ ] Sign in with sandbox account when prompted during purchase
- [ ] **Purchase Monthly Plan**
  - [ ] Tap "Start Free Trial" on billing screen
  - [ ] Apple payment sheet appears with sandbox pricing
  - [ ] Confirm purchase → entitlement granted immediately
  - [ ] RevenueCat dashboard shows active subscription
  - [ ] Backend `/api/v1/auth/me` returns `subscription_tier: "pro"`
  - [ ] ProGate-wrapped features now accessible
- [ ] **Purchase Annual Plan**
  - [ ] Same flow as monthly, verify annual pricing shown
- [ ] **Trial → Expiry (Accelerated)**
  - [ ] Sandbox auto-renews every 3-5 minutes (monthly = 5 min)
  - [ ] After trial period, verify auto-renewal charges sandbox account
  - [ ] After 6 renewals, subscription auto-cancels in sandbox
  - [ ] Verify app downgrades to Starter when entitlement expires
  - [ ] ProGate blocks features again after downgrade
- [ ] **Cancel Subscription**
  - [ ] Go to Settings → Subscriptions → Cancel
  - [ ] Verify `cancelledButActive` state shows in app
  - [ ] Banner: "Pro access until [date]" appears
  - [ ] After period ends, verify downgrade to Starter
- [ ] **Restore Purchases**
  - [ ] Uninstall app
  - [ ] Reinstall from TestFlight
  - [ ] Tap "Restore Purchases" on billing screen or ProGate
  - [ ] Verify subscription restored if sandbox sub still active
  - [ ] If expired, verify "No Purchases Found" alert
- [ ] **Billing Retry (Grace Period)**
  - [ ] RevenueCat dashboard → simulate billing issue
  - [ ] Verify `inGracePeriod` state shows warning banner
  - [ ] User retains access during grace period
  - [ ] After grace period expires, access revoked
- [ ] **RevenueCat Dashboard Verification**
  - [ ] Customer created with correct app user ID
  - [ ] Entitlement shows "pro" with correct dates
  - [ ] Transaction history shows sandbox purchases
  - [ ] Webhook events sent to backend endpoint

### Android Stripe Test Mode

- [ ] Configure RevenueCat with Stripe test mode key
- [ ] Verify Stripe checkout opens in-app browser
- [ ] Complete test purchase with Stripe test card (4242...)
- [ ] Verify entitlement granted after Stripe webhook
- [ ] Restore purchases works on Android

### Backend Webhook Verification

- [ ] RevenueCat webhook fires on initial purchase
- [ ] Webhook fires on renewal
- [ ] Webhook fires on cancellation
- [ ] Webhook fires on billing issue
- [ ] Backend updates `subscription_status` and `subscription_source` correctly
- [ ] `is_pro` flag accurate across all webhook events

---

## QA Checklist

### Screen Rendering — iOS

| Screen | iPhone SE (4.7") | iPhone 15 (6.1") | iPhone 15 Pro Max (6.7") |
|---|---|---|---|
| Search (Home) | [ ] | [ ] | [ ] |
| Search Modal | [ ] | [ ] | [ ] |
| Camera Scanner | [ ] | [ ] | [ ] |
| Analyzing | [ ] | [ ] | [ ] |
| Verdict | [ ] | [ ] | [ ] |
| Strategy | [ ] | [ ] | [ ] |
| Deal Maker | [ ] | [ ] | [ ] |
| Deal Gap Chart | [ ] | [ ] | [ ] |
| Property Details | [ ] | [ ] | [ ] |
| DealVault | [ ] | [ ] | [ ] |
| Search History | [ ] | [ ] | [ ] |
| Profile | [ ] | [ ] | [ ] |
| Settings | [ ] | [ ] | [ ] |
| Onboarding | [ ] | [ ] | [ ] |
| Billing | [ ] | [ ] | [ ] |
| Proforma | [ ] | [ ] | [ ] |
| LOI Generation | [ ] | [ ] | [ ] |
| Login | [ ] | [ ] | [ ] |
| Register | [ ] | [ ] | [ ] |

### Screen Rendering — Android

| Screen | Small (5") | Medium (6.1") | Large (6.7"+) |
|---|---|---|---|
| Search (Home) | [ ] | [ ] | [ ] |
| Verdict | [ ] | [ ] | [ ] |
| Strategy | [ ] | [ ] | [ ] |
| Deal Maker | [ ] | [ ] | [ ] |
| DealVault | [ ] | [ ] | [ ] |
| Profile | [ ] | [ ] | [ ] |
| Billing | [ ] | [ ] | [ ] |
| Login / Register | [ ] | [ ] | [ ] |

### Safe Area Handling

- [ ] Status bar text visible on all screens (light text on dark bg)
- [ ] Content doesn't overlap with Dynamic Island (iPhone 14 Pro+)
- [ ] Content doesn't overlap with notch (iPhone X–13)
- [ ] Home indicator area clear on all screens
- [ ] Tab bar respects bottom safe area
- [ ] Keyboard avoidance works on all form screens
- [ ] Android edge-to-edge rendering correct
- [ ] Android status bar transparent/dark

### Dark Theme Consistency

- [ ] Base background: `#000000` on all screens
- [ ] Card background: `#0C1220` consistent
- [ ] Panel background: `#101828` consistent
- [ ] Text hierarchy: heading `#F1F5F9`, body `#CBD5E1`, secondary `#94A3B8`
- [ ] Accent: `#0EA5E9` consistent across buttons, links, active states
- [ ] No white flashes during navigation transitions
- [ ] No light-themed system components leaking through

### Proprietary Metrics Accuracy

- [ ] **Income Value** = NOI / (LTV × Mortgage Constant) — matches backend
- [ ] **Target Buy** = Income Value × 0.95 — correct 5% discount
- [ ] **Deal Gap** = (List Price − Target Buy) / List Price × 100
- [ ] **Verdict Score** components sum correctly (35% + 30% + 20% + 15%)
- [ ] Deal Gap zones match thresholds: <0 Loss, 0-2 High Risk, 2-5 Negotiate, 5-12 Profit, >12 Deep Value
- [ ] Score colors match thresholds: ≥80 green, ≥65 teal, ≥50 gold, ≥30 orange, <30 red
- [ ] Financial values use `??` (nullish coalescing), not `||` — zero values preserved
- [ ] All currency formatting uses `$X,XXX` (no cents)
- [ ] Percentage formatting uses `X.X%` (one decimal)

### Strategy Calculations

| Strategy | Key Metrics to Verify |
|---|---|
| LTR | CoC, Cap Rate, DSCR, Monthly Cash Flow, Annual NOI |
| STR | CoC, ADR, Occupancy, RevPAR, Gross Revenue |
| BRRRR | Cash Recovery %, Equity Created, Post-Refi CF, ARV |
| Flip | Net Profit, ROI, Annualized ROI, 70% Rule Pass/Fail |
| House Hack | Net Housing Cost, Savings vs Renting, Cost Reduction % |
| Wholesale | Assignment Fee, MAO, ROI on EMD, Deal Viability |

### Navigation & Deep Links

- [ ] `dealgapiq://property/{zpid}` opens Property Details
- [ ] `dealgapiq://verdict?address=...` opens Verdict
- [ ] `https://dealgapiq.com/verify-email?token=...` opens Verify Email
- [ ] `https://dealgapiq.com/reset-password?token=...` opens Reset Password
- [ ] Tab navigation preserves scroll position
- [ ] Back navigation returns to correct previous screen
- [ ] AuthGuard redirects unauthenticated users to login

### Push Notifications

- [ ] Permission prompt appears (after onboarding, not on first launch)
- [ ] Device token registered with backend after permission grant
- [ ] Foreground: in-app banner appears (not system notification)
- [ ] Background: system notification displayed
- [ ] Tap notification → opens correct deep-linked screen
- [ ] Banner auto-dismisses after 5 seconds
- [ ] Close button on banner dismisses immediately

### Biometric Auth

- [ ] iOS: Face ID prompt on app resume (after 3+ seconds in background)
- [ ] iOS: Touch ID prompt on devices without Face ID
- [ ] Android: Fingerprint / Face Unlock prompt
- [ ] Biometric toggle in Settings enables/disables correctly
- [ ] Failed biometric shows lock screen with retry button
- [ ] Biometric preference persists across app restarts

### Offline Behavior

- [ ] Previously viewed Verdicts load from cache when offline
- [ ] DealVault list shows cached properties when offline
- [ ] Red "No internet connection" banner appears when offline
- [ ] Banner disappears when connection restored
- [ ] Auto-retry fires when connection restored
- [ ] New searches disabled when offline
- [ ] Profile edits disabled when offline
- [ ] Purchases disabled when offline

### Camera Scanner

- [ ] Permission request on first access
- [ ] Camera feed displays (back-facing)
- [ ] Viewfinder corners render
- [ ] "Enter Manually" opens text input overlay
- [ ] "Search" navigates to search modal
- [ ] Manual address entry → analyzing flow works

---

## App Store Review Guidelines Compliance

- [ ] No placeholder content visible in production build
- [ ] No "coming soon" text in user-facing screens
- [ ] Login/register works (reviewer needs a test account)
- [ ] Provide reviewer credentials in App Store Connect notes
- [ ] IAP products match what's configured in App Store Connect
- [ ] Restore Purchases button is accessible (Apple requirement)
- [ ] Privacy Policy URL accessible and accurate
- [ ] Terms of Service URL accessible
- [ ] Camera/location usage descriptions are specific and accurate
- [ ] No private API usage
- [ ] No crash on launch (test on clean install)
