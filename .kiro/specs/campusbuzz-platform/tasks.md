# Implementation Plan: CampusBuzz Platform

## Overview

Implement the CampusBuzz campus event management platform in twelve ordered phases: constants →
models → middleware → bug fixes → payment system → email templates → waitlist API → recommendations
API → frontend pages → components → payment pages → seed script. Each phase builds on the previous
and ends with all code wired together.

## Tasks

- [x] 1. Create constants module
  - Write `src/lib/constants.ts` exporting all numeric thresholds and string enums:
    `ANOMALY_WARN_THRESHOLD = 0.6`, `ANOMALY_BLOCK_THRESHOLD = 0.8`,
    `MIN_TRAINING_SAMPLES = 20`, `RETRAIN_INTERVAL = 100`,
    `WAITLIST_HOUR_DISCOUNT_MS = 3_600_000`, `RECOMMENDATION_TOP_K = 5`,
    `CACHE_TTL_MS = 3_600_000`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS = 30`,
    `EVENT_CATEGORIES` readonly array, `PAYMENT_PROVIDERS`, `REGISTRATION_ID_PREFIX = 'CP-'`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Implement database models
  - [x] 2.1 Implement User model (`src/models/User.ts`)
    - Fields: `name`, `email` (unique, lowercase), `password`, `role` (default `'student'`),
      `college`, timestamps
    - _Requirements: 2.1_

  - [x] 2.2 Implement Event model (`src/models/Event.ts`)
    - Fields per spec including `feeType`, `feeAmount`, `isCancelled`, `cancelledAt`,
      `cancelReason`, `registeredCount` (default 0), `isActive` (default true)
    - Add `pre('save')` hook that rejects save when `endDate <= date` with message
      `'endDate must be after date'`
    - _Requirements: 2.2, 2.6_

  - [x] 2.3 Implement Registration model (`src/models/Registration.ts`)
    - Fields: `userId`, `eventId`, `registrationId` (unique, format `CP-XXXXXXXXXXXXXXXX`),
      `qrCode`, `checkedIn` (default false), `checkedInAt`, `anomalyScore`, `flagged`
      (default false), `adminOverride` (default false), `paymentId`
    - Add index on `registrationId` for single-lookup performance
    - _Requirements: 2.3, 2.7_

  - [x] 2.4 Implement Payment model (`src/models/Payment.ts`)
    - Fields: `userId`, `eventId`, `registrationId`, `amount`, `provider`, `transactionId`
      (sparse unique), `status`, `purchaseOrderId` (sparse unique), `purchaseOrderName`,
      `metadata`, `refundedAt`, `refundedBy`
    - _Requirements: 2.4, 2.8_

  - [x] 2.5 Implement Waitlist model (`src/models/Waitlist.ts`)
    - Fields: `eventId`, `userId`, `priorityScore`, `joinedAt`
    - Compound unique index on `(eventId, userId)`; compound index on `(eventId, priorityScore)`
    - _Requirements: 2.5_

  - [x] 2.6 Write property test for Event model date validation
    - **Property 1: endDate must be strictly after date**
    - **Validates: Requirements 2.6**

- [x] 3. Implement middleware and RBAC
  - [x] 3.1 Write `src/middleware.ts`
    - Use `getToken()` (zero DB round-trips) to read JWT role
    - Redirect unauthenticated requests to `/admin/*` → `/auth/login`
    - Redirect authenticated students on `/admin/*` → `/`
    - Redirect authenticated admins on `/auth/login` or `/auth/signup` → `/admin/dashboard`
    - Redirect authenticated students on `/auth/login` or `/auth/signup` → `/events`
    - Export `config.matcher` excluding `/_next/`, `/api/auth/`, and static files
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.8_

  - [x] 3.2 Update `src/app/admin/layout.tsx` (AdminLayout)
    - Server-side `getServerSession` check; redirect to `/auth/login` if `role !== 'admin'`
    - Render AdminSidebar + children
    - _Requirements: 3.5_

  - [x] 3.3 Write unit tests for middleware RBAC routing logic
    - Test all redirect cases: unauthenticated admin route, student on admin route,
      admin on auth routes, student on auth routes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Apply bug fixes
  - [x] 4.1 Fix signup API (`src/app/api/auth/signup/route.ts`) — FIX-01
    - Remove any admin auto-assignment logic; always create users with `role: 'student'`
    - _Requirements: 4.1_

  - [x] 4.2 Fix check-in API (`src/app/api/checkin/route.ts`) — FIX-02
    - Replace two-step find+update with atomic `findOneAndUpdate({ registrationId, checkedIn: false })`
    - Return HTTP 400 with `{ error: 'Already checked in', checkedInAt }` when already checked in
    - _Requirements: 4.2, 10.2, 10.3_

  - [x] 4.3 Fix register API (`src/app/api/register/route.ts`) — FIX-03
    - Add guard: if `event.feeType === 'paid'` return HTTP 400 `{ error: 'Paid event — use payment flow' }`
    - _Requirements: 4.3_

  - [x] 4.4 Preserve MongoDB startup reconcile hook (`src/lib/mongodb.ts`) — FIX-04
    - Ensure `dbConnect()` calls `reconcileAllEvents()` as fire-and-forget on first connection
    - _Requirements: 4.4_

  - [x] 4.5 Fix CheckinFeatures module (`src/lib/ml/checkinFeatures.ts`) — FIX-05/07
    - Accept optional `adminOverride` boolean parameter
    - When `adminOverride === true`, skip aggregation and return zero-vector immediately
    - _Requirements: 4.5_

  - [x] 4.6 Fix ModelManager training (`src/lib/ml/modelManager.ts`) — FIX-06/07
    - Exclude registrations where `adminOverride === true` from training dataset
    - When fewer than `MIN_TRAINING_SAMPLES` valid vectors remain after filtering, log warning
      and return without updating the model
    - _Requirements: 4.6, 4.7, 9.1_

  - [x] 4.7 Write unit tests for bug-fix scenarios
    - Test atomic check-in prevents double check-in
    - Test signup never assigns admin role
    - Test register route rejects paid events
    - Test ModelManager skips training below MIN_TRAINING_SAMPLES
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

- [x] 5. Checkpoint — ensure models, middleware, and bug fixes compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement payment system
  - [x] 6.1 Implement payment init API (`src/app/api/payment/init/route.ts`)
    - Validate event exists and `feeType === 'paid'`; return HTTP 400 for free events
    - Return HTTP 409 if student already has a `completed` Payment for this event
    - Create Payment document with `status: 'pending'`; return provider config
    - _Requirements: 5.1, 5.8, 5.9_

  - [x] 6.2 Implement `completeRegistration` in `src/lib/payment.ts`
    - Use MongoDB session/transaction to atomically: create Registration, increment
      `event.registeredCount`, link Payment to Registration
    - Abort transaction and throw if event is at capacity
    - _Requirements: 5.5, 5.10_

  - [x] 6.3 Implement Khalti verify API (`src/app/api/payment/khalti/verify/route.ts`)
    - Verify `pidx` with Khalti lookup; confirm `status === 'Completed'` and amount matches
    - On success: update Payment to `completed`, call `completeRegistration`, return `{ success: true }`
    - On failure: update Payment to `failed`, return error
    - _Requirements: 5.2, 5.4_

  - [x] 6.4 Implement eSewa callback API (`src/app/api/payment/esewa/callback/route.ts`)
    - On `status=success` and verification pass: update Payment to `completed`, call
      `completeRegistration`, redirect to `/my-events?payment=success`
    - On failure: update Payment to `failed`, redirect to `/payment/failed`
    - _Requirements: 5.3, 5.4_

  - [x] 6.5 Implement admin event cancellation in `src/app/api/events/[id]/route.ts` (DELETE)
    - Set `event.isCancelled = true`, `event.isActive = false`
    - Update all `completed` Payments for the event to `status: 'refunded'` with `refundedAt`
      and `refundedBy`
    - _Requirements: 5.6, 11.3_

  - [x] 6.6 Implement admin refund API (`src/app/api/admin/payments/refund/route.ts`)
    - Update Payment `status` to `'refunded'`, record `refundedAt` and `refundedBy`
    - _Requirements: 5.7_

  - [x] 6.7 Write property test for completeRegistration atomicity
    - **Property 2: completeRegistration either fully succeeds or leaves no partial state**
    - **Validates: Requirements 5.5, 5.10**

  - [x] 6.8 Write unit tests for payment flow edge cases
    - Test init rejects free events (HTTP 400)
    - Test init rejects duplicate completed payment (HTTP 409)
    - Test capacity abort in completeRegistration
    - _Requirements: 5.8, 5.9, 5.10_

- [x] 7. Implement email templates (`src/lib/email.ts`)
  - Implement 5 Nodemailer HTML templates using dark theme (`#0f172a` bg, `#14b8a6` accent):
    1. `sendRegistrationConfirmation` — event name, date, venue, registrationId, inline QR
    2. `sendPaymentConfirmation` — event name, amount, provider, transactionId, QR code
    3. `sendWaitlistPromotion` — event name, date, venue, QR code
    4. `sendCancellationEmail` — event name, cancel reason, refund policy notice (bulk send)
    5. `sendRefundConfirmation` — event name, refunded amount, provider
  - Wrap all `transporter.sendMail` calls in try/catch; log errors, never throw
  - Wire `sendRegistrationConfirmation` into free-event register API
  - Wire `sendPaymentConfirmation` into `completeRegistration`
  - Wire `sendCancellationEmail` into event DELETE handler
  - Wire `sendRefundConfirmation` into admin refund API
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 8. Implement waitlist API and MinHeap wiring
  - [x] 8.1 Verify/fix MinHeap implementation (`src/lib/algorithms/minHeap.ts`)
    - Ensure `insert` and `extractMin` maintain the min-heap property
    - Ensure `peek()` returns the minimum-score element without removing it
    - _Requirements: 7.2_

  - [x] 8.2 Write property test for MinHeap ordering invariant
    - **Property 3: After any sequence of inserts, peek().priorityScore is always the minimum**
    - **Validates: Requirements 7.2**

  - [x] 8.3 Implement `promoteTopWaitlistUser` in `src/lib/algorithms/waitlistManager.ts`
    - Atomically remove top Waitlist entry, create Registration, increment
      `event.registeredCount`, send promotion email via `sendWaitlistPromotion`
    - Return without error if heap is empty
    - _Requirements: 7.3, 7.4_

  - [x] 8.4 Implement waitlist API (`src/app/api/waitlist/route.ts`)
    - POST: compute `priorityScore = joinedAt.getTime() - (checkedInCount * WAITLIST_HOUR_DISCOUNT_MS)`,
      persist Waitlist doc; return HTTP 409 if already registered, HTTP 400 if capacity available
    - GET: return student's `position` (1-based) and `queueLength`
    - DELETE: remove Waitlist doc and invalidate in-memory heap
    - _Requirements: 7.1, 7.5, 7.6, 7.7, 7.8_

  - [x] 8.5 Write unit tests for waitlist priority and promotion
    - Test priorityScore computation with attendance bonus
    - Test promoteTopWaitlistUser creates registration and decrements waitlist
    - Test duplicate join returns 409, capacity-available returns 400
    - _Requirements: 7.1, 7.3, 7.7, 7.8_

- [x] 9. Implement recommendations API wiring
  - [x] 9.1 Verify/fix Recommender (`src/lib/recommendations/recommender.ts`)
    - Confirm cosine similarity + TF-IDF weighting: `IDF = log(totalUsers/(count+1))+1`
    - Fallback to top-K by `registeredCount` with reason `'Trending on campus'` for users
      with no registrations
    - Only include events with `isActive: true` and `date >= now`
    - Return at most `RECOMMENDATION_TOP_K` results with `event`, `score`, `reason`
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [x] 9.2 Verify/fix RecommendationCache (`src/lib/recommendations/recommendationCache.ts`)
    - TTL = `CACHE_TTL_MS` (1 hour) per userId; return cached result with `fromCache: true`
    - _Requirements: 8.4_

  - [x] 9.3 Wire recommendations API (`src/app/api/recommendations/route.ts`)
    - Require authenticated session; check cache first; call Recommender; store in cache
    - _Requirements: 8.5_

  - [x] 9.4 Write property test for recommender cosine similarity
    - **Property 4: Cosine similarity is symmetric — sim(a,b) === sim(b,a)**
    - **Validates: Requirements 8.1**

  - [x] 9.5 Write unit tests for recommendation cache TTL and fallback
    - Test cache hit returns `fromCache: true`
    - Test fallback for user with no registrations
    - _Requirements: 8.2, 8.4_

- [x] 10. Checkpoint — ensure all API routes and algorithms compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement frontend components
  - [x] 11.1 Implement Navbar component (`src/components/Navbar.tsx`)
    - Show "Login" and "Sign Up" when unauthenticated
    - Show student name and logout option when authenticated
    - _Requirements: 12.7_

  - [x] 11.2 Implement EventCard component (`src/components/EventCard.tsx`)
    - Display event title, date, category badge, venue, fee type, registered/capacity
    - Link to `/events/[id]`
    - _Requirements: 12.1_

  - [x] 11.3 Implement PaymentModal component (`src/components/PaymentModal.tsx`)
    - Provider selection (eSewa / Khalti), trigger payment init API, handle redirect/SDK launch
    - _Requirements: 12.2, 5.1_

  - [x] 11.4 Implement DeleteModal component (`src/components/DeleteModal.tsx`)
    - Confirmation dialog for event deletion; call DELETE `/api/events/[id]`
    - _Requirements: 11.3_

  - [x] 11.5 Implement AdminSidebar component (`src/components/AdminSidebar.tsx`)
    - Links to Dashboard, Events, Scanner, Payments, Flagged Check-ins, Logout
    - Highlight active route using `usePathname`
    - _Requirements: 13.1, 13.2_

- [x] 12. Implement frontend pages
  - [x] 12.1 Implement landing page (`src/app/page.tsx`)
    - Hero section, features section, statistics bar, trending events carousel (top 3 by
      `registeredCount`)
    - _Requirements: 12.6_

  - [x] 12.2 Implement events listing page (`src/app/events/page.tsx`)
    - Responsive grid of EventCards; search by title; filter by category
    - _Requirements: 12.1_

  - [x] 12.3 Implement event detail page (`src/app/events/[id]/page.tsx`)
    - Full event info; context-aware action button: Register / Pay and Register / Join Waitlist /
      Cancel Registration / Event Full
    - Display inline QR code when student is registered
    - _Requirements: 12.2, 12.3_

  - [x] 12.4 Implement my-events page (`src/app/my-events/page.tsx`)
    - List student's registrations: event name, date, venue, check-in status badge, QR code
    - _Requirements: 12.4_

  - [x] 12.5 Implement my-payments page (`src/app/my-payments/page.tsx`)
    - List student's payments: event name, amount, provider, status badge, transaction ID
    - _Requirements: 12.5_

  - [x] 12.6 Implement admin dashboard page (`src/app/admin/dashboard/page.tsx`)
    - Stats cards: total events, upcoming events, total students, total registrations,
      checked-in count
    - Registrations trend line chart (Recharts), category breakdown pie chart, popular events table
    - _Requirements: 11.5_

  - [x] 12.7 Implement admin events pages
    - `src/app/admin/events/page.tsx`: table with title, date, category, registered/capacity,
      status, View/Edit/Delete actions
    - `src/app/admin/events/new/page.tsx`: create event form with validation
    - `src/app/admin/events/[id]/edit/page.tsx`: edit event form
    - `src/app/admin/events/[id]/view/page.tsx`: attendee list with check-in status, anomaly
      scores, link to scanner
    - _Requirements: 11.1, 11.2, 11.4, 11.6_

  - [x] 12.8 Implement admin scanner page (`src/app/admin/scanner/page.tsx`)
    - Activate device camera using html5-qrcode; decode QR in real time; call check-in API
    - Display success/warning/blocked feedback per anomaly score result
    - _Requirements: 10.7, 9.2, 9.3, 9.4_

  - [x] 12.9 Implement admin payments page (`src/app/admin/payments/page.tsx`)
    - List all payments with event name, student, amount, provider, status; refund action
    - _Requirements: 5.7_

  - [x] 12.10 Implement admin flagged page (`src/app/admin/flagged/page.tsx`)
    - List flagged registrations sorted by `anomalyScore` descending; admin override button
      calls `PATCH /api/admin/flagged`
    - _Requirements: 9.8, 9.9_

- [x] 13. Implement payment result pages
  - [x] 13.1 Implement payment verify page (`src/app/payment/verify/page.tsx`)
    - Call verification API on load; show loading state; display success message, event name,
      link to "My Events" on success
    - _Requirements: 14.1, 14.3_

  - [x] 13.2 Implement payment failed page (`src/app/payment/failed/page.tsx`)
    - Display failure message, reason if available, links to retry or return to events
    - _Requirements: 14.2_

- [x] 14. Checkpoint — ensure all pages and components compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement seed script (`scripts/seed.js`)
  - Drop and recreate all collections for a clean state
  - Create 2 admin users and 10 student users with bcrypt-hashed passwords
  - Create 15+ Events across all 7 categories, mix of free/paid, past/upcoming dates
  - Create Registrations linking students to events; some with `checkedIn: true` and
    `anomalyScore` values to enable IsolationForest training
  - Create Waitlist entries for at least one full event
  - Create Payment records for paid-event registrations with mix of `completed`, `pending`,
    `refunded` statuses
  - Log a summary of created document counts on completion
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [x] 16. Final checkpoint — full build and test pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `next build` completes without TypeScript or ESLint errors (_Requirements: 16.1_)

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Phases are ordered: constants → models → middleware → bug fixes → payment → email → waitlist
  → recommendations → components → pages → payment pages → seed
- Property tests validate universal correctness invariants; unit tests cover specific examples
  and edge cases
