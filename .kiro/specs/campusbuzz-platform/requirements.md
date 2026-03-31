# Requirements Document

## Introduction

CampusBuzz is a full-stack campus event management platform built with Next.js 14 (App Router),
TypeScript, MongoDB/Mongoose, and NextAuth. The platform serves two user roles — Students and
Admins — and must be completed by fixing existing bugs, wiring up disconnected algorithms, and
implementing missing pages, components, and API routes as described in the AGENTS-COMPLETE.md
specification. The implementation is divided into ordered phases: Constants → Models → Middleware
→ Bug Fixes → Payment System → Email Templates → Frontend Pages → Components → Payment Pages →
Seed Script.

---

## Glossary

- **System**: The CampusBuzz Next.js application as a whole.
- **Student**: An authenticated user with role `student`.
- **Admin**: An authenticated user with role `admin`.
- **Event**: A campus event document stored in MongoDB via the Event model.
- **Registration**: A document linking a Student to an Event, containing a unique QR code.
- **Waitlist**: A priority queue entry for a Student on a full Event.
- **Payment**: A transaction record for a paid Event, linked to a provider (eSewa or Khalti).
- **MinHeap**: The generic min-heap data structure used to order the Waitlist by priority score.
- **WaitlistManager**: The module that manages Waitlist heap operations and promotion logic.
- **Recommender**: The collaborative-filtering module that produces personalised Event suggestions.
- **IsolationForest**: The anomaly-detection ML model used to score check-in attempts.
- **ModelManager**: The module that trains, caches, and exposes the IsolationForest model.
- **CheckinFeatures**: The module that extracts a numeric feature vector from a check-in context.
- **Middleware**: The Next.js `src/middleware.ts` file that enforces RBAC on all routes.
- **AdminLayout**: The `src/app/admin/layout.tsx` server component that guards admin pages.
- **RBAC**: Role-Based Access Control — the mechanism that restricts routes by user role.
- **QR_Code**: A Base64-encoded PNG data URL embedded in a Registration document.
- **PriorityScore**: A numeric value computed as `joinedAt.getTime() - attendanceBonus * 3_600_000`.
- **AnomalyScore**: A float in [0, 1] produced by IsolationForest; higher means more anomalous.
- **eSewa**: A Nepali payment gateway integrated via form-POST redirect flow.
- **Khalti**: A Nepali payment gateway integrated via JavaScript SDK + server-side verification.
- **Nodemailer**: The email-sending library used for all transactional emails.
- **RecommendationCache**: An in-memory TTL cache (1 hour) for Recommender results.
- **Reconcile**: The startup utility that corrects `registeredCount` on all active Events.
- **SeedScript**: The `scripts/seed.js` file that populates demo data for testing.
- **Constants**: The `src/lib/constants.ts` file that centralises all magic values.

---

## Requirements

### Requirement 1: Constants Module

**User Story:** As a developer, I want all magic values centralised in one file, so that I can
change thresholds and configuration without hunting through the codebase.

#### Acceptance Criteria

1. THE System SHALL export a `src/lib/constants.ts` file that defines all numeric thresholds,
   string enums, and configuration values referenced across the codebase (anomaly thresholds,
   retrain interval, min training samples, waitlist hour discount, recommendation top-K, cache
   TTL, rate-limit windows, event categories, payment providers, registration ID prefix).
2. WHEN any module imports a value from `src/lib/constants.ts`, THE System SHALL resolve the
   import without TypeScript errors.
3. THE Constants module SHALL export `ANOMALY_WARN_THRESHOLD = 0.6` and
   `ANOMALY_BLOCK_THRESHOLD = 0.8` as named numeric constants.
4. THE Constants module SHALL export `MIN_TRAINING_SAMPLES = 20` and
   `RETRAIN_INTERVAL = 100` as named numeric constants.
5. THE Constants module SHALL export `WAITLIST_HOUR_DISCOUNT_MS = 3_600_000` as a named
   numeric constant.
6. THE Constants module SHALL export `EVENT_CATEGORIES` as a readonly string array containing
   `['Technical','Cultural','Sports','Workshop','Seminar','Hackathon','Other']`.

---

### Requirement 2: Database Models

**User Story:** As a developer, I want correct, fully-typed Mongoose schemas for every entity,
so that the application stores and retrieves data reliably.

#### Acceptance Criteria

1. THE System SHALL provide a `User` model with fields: `name`, `email` (unique, lowercase),
   `password` (bcrypt hash), `role` (`'student' | 'admin'`, default `'student'`), `college`,
   `createdAt`, `updatedAt`.
2. THE System SHALL provide an `Event` model with fields: `title`, `description`, `category`
   (enum), `date`, `endDate`, `venue`, `capacity`, `registeredCount` (default 0), `imageUrl`,
   `organizer`, `tags`, `isActive` (default true), `feeType` (`'free' | 'paid'`), `feeAmount`,
   `registrationDeadline` (optional), `createdBy` (ObjectId ref User), `isCancelled` (boolean,
   default false), `cancelledAt` (Date, optional), `cancelReason` (string, optional).
3. THE System SHALL provide a `Registration` model with fields: `userId`, `eventId`,
   `registrationId` (unique, format `CP-XXXXXXXXXXXXXXXX`), `qrCode` (Base64 data URL),
   `checkedIn` (default false), `checkedInAt` (optional Date), `anomalyScore` (optional Number),
   `flagged` (boolean, default false), `adminOverride` (boolean, default false), `paymentId`
   (optional ObjectId ref Payment).
4. THE System SHALL provide a `Payment` model with fields: `userId`, `eventId`,
   `registrationId` (optional ObjectId ref Registration), `amount`, `provider`
   (`'esewa' | 'khalti'`), `transactionId` (unique), `status`
   (`'pending' | 'completed' | 'failed' | 'refunded'`), `purchaseOrderId` (unique),
   `purchaseOrderName`, `metadata` (Mixed), `refundedAt` (optional Date),
   `refundedBy` (optional ObjectId ref User).
5. THE System SHALL provide a `Waitlist` model with fields: `eventId`, `userId`,
   `priorityScore` (Number), `joinedAt` (Date), compound unique index on `(eventId, userId)`,
   and a compound index on `(eventId, priorityScore)`.
6. WHEN the `Event` model's `pre('save')` hook runs and `endDate <= date`, THE Event model
   SHALL reject the save with an error message `'endDate must be after date'`.
7. IF a `Registration` document is queried by `registrationId`, THE System SHALL return the
   document within a single indexed lookup (index on `registrationId`).
8. THE `Payment` model SHALL enforce unique constraints on both `transactionId` and
   `purchaseOrderId` via sparse unique indexes.

---

### Requirement 3: Middleware and RBAC

**User Story:** As a security-conscious developer, I want all route access enforced at the
middleware layer, so that role checks cannot be bypassed by navigating directly to a URL.

#### Acceptance Criteria

1. THE Middleware SHALL intercept every request matching `/admin/:path*` and redirect
   unauthenticated users to `/auth/login`.
2. WHEN an authenticated Student navigates to any `/admin/:path*` route, THE Middleware SHALL
   redirect the Student to `/` (home page).
3. WHEN an authenticated Admin navigates to `/auth/login` or `/auth/signup`, THE Middleware
   SHALL redirect the Admin to `/admin/dashboard`.
4. WHEN an authenticated Student navigates to `/auth/login` or `/auth/signup`, THE Middleware
   SHALL redirect the Student to `/events`.
5. THE AdminLayout server component SHALL independently verify that the current session has
   `role === 'admin'` and redirect to `/auth/login` if not, providing a defence-in-depth layer.
6. WHEN any API route under `/api/admin/:path*` receives a request without a valid admin
   session, THE System SHALL return HTTP 401 with `{ "error": "Unauthorized" }`.
7. THE Middleware SHALL use the NextAuth JWT token (not a database lookup) to determine the
   user role, so that RBAC adds zero database round-trips per request.
8. THE Middleware SHALL export a `config` object with a `matcher` that excludes `/_next/`,
   `/api/auth/`, and static file paths from middleware processing.

---

### Requirement 4: Bug Fixes

**User Story:** As a developer, I want all known bugs resolved, so that the application behaves
correctly and securely.

#### Acceptance Criteria

1. THE Signup API (`/api/auth/signup`) SHALL always create new users with `role: 'student'`
   and SHALL NOT assign `role: 'admin'` based on email matching any environment variable
   (FIX-01: remove admin auto-assignment).
2. WHEN the check-in API (`/api/checkin`) processes a QR scan, THE System SHALL use a MongoDB
   `findOneAndUpdate` with `{ checkedIn: false }` as a filter condition so that a concurrent
   duplicate scan cannot check in the same Registration twice (FIX-02: atomic check-in).
3. THE Register API (`/api/register` POST) SHALL verify that `event.feeType === 'free'` before
   creating a Registration directly; WHEN `feeType === 'paid'`, THE Register API SHALL return
   HTTP 400 with `{ "error": "Paid event — use payment flow" }` (FIX-03: register route).
4. WHEN `dbConnect()` establishes a new MongoDB connection, THE System SHALL call
   `reconcileAllEvents()` as a fire-and-forget side effect to correct `registeredCount` on
   startup (FIX-04: MongoDB startup hooks — already present, must be preserved).
5. THE CheckinFeatures module SHALL accept an optional `adminOverride` boolean parameter; WHEN
   `adminOverride` is true, THE CheckinFeatures module SHALL skip the aggregation query and
   return a zero-vector so that admin-overridden records do not pollute training data (FIX-05
   and FIX-07).
6. THE ModelManager `trainModel` function SHALL exclude Registrations where
   `adminOverride === true` from the training dataset (FIX-07).
7. WHEN `trainModel` is called and fewer than `MIN_TRAINING_SAMPLES` valid feature vectors are
   produced after filtering, THE ModelManager SHALL log a warning and return without updating
   the model (FIX-06: new user grace period).

---

### Requirement 5: Payment System

**User Story:** As a Student, I want to pay for paid events through eSewa or Khalti, so that
my registration is confirmed only after successful payment.

#### Acceptance Criteria

1. WHEN the payment init API (`/api/payment/init` POST) is called with a valid `eventId` and
   `provider`, THE System SHALL create a `Payment` document with `status: 'pending'` and return
   the provider-specific configuration needed to launch the payment widget.
2. WHEN the Khalti verify API (`/api/payment/khalti/verify` POST) receives a valid `pidx` and
   the Khalti lookup confirms `status === 'Completed'` with a matching amount, THE System SHALL
   update the Payment to `status: 'completed'`, call `completeRegistration`, and return
   `{ success: true }`.
3. WHEN the eSewa callback API (`/api/payment/esewa/callback` GET) receives `status=success`
   and verification passes, THE System SHALL update the Payment to `status: 'completed'`, call
   `completeRegistration`, and redirect to `/my-events?payment=success`.
4. IF payment verification fails for either provider, THE System SHALL update the Payment to
   `status: 'failed'` and redirect or return an error response.
5. THE `completeRegistration` function SHALL use a MongoDB session/transaction to atomically
   create the Registration, increment `event.registeredCount`, and link the Payment to the
   Registration.
6. WHEN an Admin cancels an Event via `DELETE /api/events/[id]`, THE System SHALL set
   `event.isCancelled = true`, `event.isActive = false`, and update all `completed` Payments
   for that Event to `status: 'refunded'` with `refundedAt` and `refundedBy` populated.
7. WHEN an Admin marks a refund as processed via `POST /api/admin/payments/refund`, THE System
   SHALL update the Payment `status` to `'refunded'` and record `refundedAt` and `refundedBy`.
8. THE payment init API SHALL return HTTP 400 if the Event `feeType` is `'free'`.
9. THE payment init API SHALL return HTTP 409 if the Student already has a `completed` Payment
   for the same Event.
10. WHEN `completeRegistration` is called and the Event is already at capacity, THE System
    SHALL abort the transaction and throw an error so the Payment is not linked to a
    non-existent Registration.

---

### Requirement 6: Email Templates

**User Story:** As a Student, I want to receive well-formatted HTML emails for key lifecycle
events, so that I have a clear record of my registrations and payments.

#### Acceptance Criteria

1. WHEN a free-event Registration is created, THE System SHALL send a registration confirmation
   email to the Student containing the event name, date, venue, registration ID, and an inline
   QR code image.
2. WHEN a paid-event Registration is created via `completeRegistration`, THE System SHALL send
   a payment confirmation email to the Student containing the event name, amount paid, provider,
   transaction ID, and the QR code.
3. WHEN a Waitlist entry is promoted to a Registration, THE System SHALL send a waitlist
   promotion email to the Student containing the event name, date, venue, and QR code.
4. WHEN an Admin cancels an Event, THE System SHALL send a cancellation email to every
   registered Student containing the event name, cancellation reason, and refund policy notice.
5. WHEN an Admin marks a refund as processed, THE System SHALL send a refund confirmation email
   to the Student containing the event name, refunded amount, and provider.
6. ALL email templates SHALL use a dark-themed HTML layout consistent with the CampusBuzz brand
   (dark background `#0f172a`, teal accent `#14b8a6`).
7. IF Nodemailer fails to send an email, THE System SHALL log the error and continue without
   throwing, so that the primary operation (registration, refund) is not rolled back.

---

### Requirement 7: Waitlist and Min-Heap Algorithm

**User Story:** As a Student, I want to join a waitlist for a full event and be promoted fairly
when a spot opens, so that frequent attendees are rewarded with higher priority.

#### Acceptance Criteria

1. WHEN a Student calls `POST /api/waitlist` for a full Event, THE WaitlistManager SHALL
   compute a `priorityScore = joinedAt.getTime() - (checkedInCount * WAITLIST_HOUR_DISCOUNT_MS)`
   and persist a Waitlist document.
2. THE MinHeap SHALL maintain the min-heap property after every `insert` and `extractMin`
   operation, such that `heap.peek().priorityScore` is always the minimum score in the heap.
3. WHEN a Registration is cancelled or a spot otherwise opens, THE WaitlistManager SHALL call
   `promoteTopWaitlistUser` which atomically removes the top Waitlist entry, creates a
   Registration, increments `event.registeredCount`, and sends a promotion email.
4. IF the Waitlist heap is empty when `promoteTopWaitlistUser` is called, THE WaitlistManager
   SHALL return without error.
5. WHEN a Student calls `GET /api/waitlist?eventId=X`, THE System SHALL return the Student's
   current `position` (1-based) and the total `queueLength`.
6. WHEN a Student calls `DELETE /api/waitlist`, THE WaitlistManager SHALL remove the Waitlist
   document and invalidate the in-memory heap for that Event.
7. THE System SHALL prevent a Student from joining the Waitlist if the Student is already
   registered for the Event, returning HTTP 409.
8. THE System SHALL prevent a Student from joining the Waitlist if the Event still has
   available capacity, returning HTTP 400.

---

### Requirement 8: Collaborative Filtering Recommendations

**User Story:** As a Student, I want personalised event recommendations, so that I discover
events matching my interests without manually searching.

#### Acceptance Criteria

1. WHEN the Recommender is called for a Student who has at least one Registration, THE
   Recommender SHALL compute cosine similarity between the Student's event attendance vector
   and all other Students' vectors using TF-IDF weighting (IDF = log(totalUsers/(count+1))+1).
2. WHEN the Recommender is called for a Student with no Registrations, THE Recommender SHALL
   fall back to returning the top-K Events sorted by `registeredCount` descending with reason
   `'Trending on campus'`.
3. THE Recommender SHALL return at most `topK` (default 5) results, each containing `event`,
   `score`, and `reason` fields.
4. THE RecommendationCache SHALL store results per userId with a TTL of 1 hour; WHEN a cached
   result exists and has not expired, THE System SHALL return it with `fromCache: true`.
5. WHEN `GET /api/recommendations` is called by an authenticated Student, THE System SHALL
   return recommendations within 2 seconds for a dataset of up to 10,000 registrations.
6. THE Recommender SHALL only include Events with `isActive: true` and `date >= now` in its
   candidate set.

---

### Requirement 9: Isolation Forest Fraud Detection

**User Story:** As an Admin, I want suspicious check-ins flagged automatically, so that I can
review and override them without blocking legitimate attendees.

#### Acceptance Criteria

1. WHEN `trainModel` is called with at least `MIN_TRAINING_SAMPLES` valid feature vectors, THE
   ModelManager SHALL train an IsolationForest with 100 trees and subsample size 256 and set
   `isTrained = true`.
2. WHEN a check-in is processed and the model is ready, THE System SHALL compute an
   `anomalyScore` using the IsolationForest and store it on the Registration document.
3. WHEN `anomalyScore >= ANOMALY_WARN_THRESHOLD (0.6)`, THE System SHALL set
   `registration.flagged = true` and return `{ warning: true }` in the check-in response.
4. WHEN `anomalyScore >= ANOMALY_BLOCK_THRESHOLD (0.8)`, THE System SHALL set
   `registration.checkedIn = false` and return `{ blocked: true, success: false }`.
5. WHEN the model is not yet trained, THE System SHALL allow check-in without scoring and
   return `anomalyScore: null`.
6. WHEN `RETRAIN_INTERVAL` (100) successful check-ins have occurred since the last training,
   THE ModelManager SHALL trigger an asynchronous retrain.
7. THE CheckinFeatures module SHALL extract a 6-element numeric vector: `[hourOfDay,
   daysSinceRegistration, totalRegistrations, checkinRate, minutesRelativeToEventStart,
   sameCategoryCheckinCount]`.
8. WHEN an Admin overrides a flagged Registration via `PATCH /api/admin/flagged`, THE System
   SHALL set `checkedIn: true`, `flagged: false`, and `adminOverride: true` on the Registration.
9. THE `GET /api/admin/flagged` endpoint SHALL return all Registrations where `flagged: true`,
   sorted by `anomalyScore` descending, populated with user and event details.

---

### Requirement 10: QR Code Check-in

**User Story:** As an Admin, I want to scan a student's QR code to check them in, so that
attendance is recorded accurately and in real time.

#### Acceptance Criteria

1. WHEN the check-in API receives a `registrationId`, THE System SHALL look up the Registration
   by that ID and verify it exists.
2. WHEN the Registration is already `checkedIn: true`, THE System SHALL return HTTP 400 with
   `{ "error": "Already checked in", "checkedInAt": <timestamp> }`.
3. THE check-in API SHALL use an atomic `findOneAndUpdate` with filter `{ registrationId,
   checkedIn: false }` to prevent race conditions from concurrent scans.
4. WHEN check-in succeeds, THE System SHALL set `checkedIn: true` and `checkedInAt` to the
   current server timestamp.
5. THE check-in API SHALL be rate-limited to 30 requests per minute per IP address.
6. THE check-in API SHALL require `role === 'admin'` and return HTTP 401 for non-admin callers.
7. WHEN the QR scanner page is loaded, THE System SHALL activate the device camera and decode
   QR codes in real time using the html5-qrcode library.

---

### Requirement 11: Admin Event Management

**User Story:** As an Admin, I want to create, edit, and delete events, so that the event
catalogue stays accurate and up to date.

#### Acceptance Criteria

1. WHEN an Admin submits the create-event form, THE System SHALL validate that `endDate > date`,
   `capacity > 0`, and required fields are present before persisting the Event.
2. WHEN an Admin edits an Event, THE System SHALL update only the provided fields and return
   the updated Event document.
3. WHEN an Admin deletes an Event, THE System SHALL set `isActive: false` and `isCancelled:
   true` rather than hard-deleting the document, and SHALL trigger cancellation emails and
   refund status updates for all affected Payments.
4. THE Admin events list page SHALL display all Events with columns: title, date, category,
   registered/capacity, status, and action buttons (View, Edit, Delete).
5. THE Admin dashboard SHALL display: total events, upcoming events, total students, total
   registrations, checked-in count, a registrations trend line chart, a category breakdown pie
   chart, and a popular events table.
6. WHEN an Admin navigates to an event's detail view, THE System SHALL display the full
   attendee list with check-in status, anomaly scores for flagged entries, and a link to the
   QR scanner.

---

### Requirement 12: Student-Facing Pages

**User Story:** As a Student, I want to browse events, register, view my registrations, and
track my payments, so that I can manage my campus event participation in one place.

#### Acceptance Criteria

1. THE events listing page SHALL display all active Events in a responsive grid, with search
   by title and filter by category.
2. THE event detail page SHALL show full event information and a context-aware action button:
   "Register" (free, spots available), "Pay and Register" (paid, spots available), "Join
   Waitlist" (full), "Cancel Registration" (already registered), or "Event Full" (full, already
   waitlisted).
3. WHEN a Student is registered for an Event, THE event detail page SHALL display the QR code
   inline so the Student can show it at the venue.
4. THE my-events page SHALL list all of the Student's Registrations with event name, date,
   venue, check-in status badge, and a QR code download/display option.
5. THE my-payments page SHALL list all of the Student's Payments with event name, amount,
   provider, status badge, and transaction ID.
6. THE landing page SHALL display a hero section, a features section, a statistics bar, and a
   trending events carousel showing the top 3 Events by `registeredCount`.
7. WHILE a Student is not authenticated, THE Navbar SHALL display "Login" and "Sign Up" links;
   WHEN authenticated, THE Navbar SHALL display the Student's name and a logout option.

---

### Requirement 13: Admin Sidebar and Navigation

**User Story:** As an Admin, I want a persistent sidebar navigation, so that I can move between
admin sections without losing context.

#### Acceptance Criteria

1. THE AdminSidebar component SHALL render links to: Dashboard, Events, Scanner, Payments,
   Flagged Check-ins, and a Logout button.
2. WHEN the current route matches a sidebar link, THE AdminSidebar SHALL highlight that link
   as active.
3. THE AdminLayout SHALL wrap all `/admin/*` pages with the AdminSidebar and enforce the admin
   role check server-side.

---

### Requirement 14: Payment Pages

**User Story:** As a Student, I want clear success and failure pages after a payment attempt,
so that I know whether my registration was confirmed.

#### Acceptance Criteria

1. WHEN a payment succeeds and the Student is redirected to `/payment/verify`, THE System SHALL
   display a success message, the event name, and a link to "My Events".
2. WHEN a payment fails and the Student is redirected to `/payment/failed`, THE System SHALL
   display a failure message, the reason if available, and a link to retry or return to events.
3. THE payment verify page SHALL call the appropriate verification API on load and display a
   loading state while verification is in progress.

---

### Requirement 15: Seed Script

**User Story:** As a developer, I want a seed script that populates realistic demo data, so
that I can test all features without manually creating records.

#### Acceptance Criteria

1. THE SeedScript SHALL create at least 2 admin users and 10 student users with hashed
   passwords.
2. THE SeedScript SHALL create at least 15 Events across all 7 categories, with a mix of free
   and paid events, past and upcoming dates.
3. THE SeedScript SHALL create Registrations linking students to events, including some with
   `checkedIn: true` and `anomalyScore` values, to enable IsolationForest training.
4. THE SeedScript SHALL create Waitlist entries for at least one full Event.
5. THE SeedScript SHALL create Payment records for paid-event Registrations with a mix of
   `completed`, `pending`, and `refunded` statuses.
6. WHEN the SeedScript is run, THE System SHALL drop and recreate all collections to ensure a
   clean state.
7. THE SeedScript SHALL log a summary of created documents on completion.

---

### Requirement 16: Performance and Build Quality

**User Story:** As a developer, I want the application to build without errors and follow
performance best practices, so that it is production-ready.

#### Acceptance Criteria

1. THE System SHALL compile with `next build` without TypeScript errors or ESLint errors.
2. ALL Mongoose queries that do not require Mongoose document methods SHALL use `.lean()` to
   return plain JavaScript objects.
3. ALL Mongoose queries SHALL use `.select()` to project only the fields required by the
   caller.
4. WHEN counting documents, THE System SHALL use `countDocuments()` rather than fetching full
   documents and measuring array length.
5. WHEN multiple independent database queries are needed in a single request handler, THE
   System SHALL execute them concurrently using `Promise.all`.
6. WHEN an API route receives an `id` path parameter, THE System SHALL validate it with
   `mongoose.Types.ObjectId.isValid(id)` and return HTTP 400 for invalid IDs before querying
   the database.
7. THE System SHALL not expose raw error stack traces in API responses; all error responses
   SHALL use a generic message with the detail logged server-side only.

---

### Requirement 17: Parser and Serializer — QR Code Round-Trip

**User Story:** As a developer, I want QR code data to survive encode/decode cycles intact,
so that check-in never fails due to data corruption.

#### Acceptance Criteria

1. WHEN a QR code is generated, THE System SHALL encode the payload as
   `JSON.stringify({ registrationId, eventId, userId })`.
2. THE Pretty_Printer SHALL format QR payloads back into valid JSON strings via `JSON.stringify`.
3. FOR ALL valid QR payloads, parsing then printing then parsing SHALL produce an equivalent
   object (round-trip property): `JSON.parse(JSON.stringify(JSON.parse(qrData)))` deep-equals
   the original payload.
4. WHEN the check-in API receives a `registrationId` from a scanned QR code, THE System SHALL
   look up the Registration by `registrationId` string only (not by parsing the full QR JSON
   again), so that the check-in path is independent of QR encoding format changes.
