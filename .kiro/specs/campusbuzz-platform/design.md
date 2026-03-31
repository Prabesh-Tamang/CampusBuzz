# Design Document — CampusBuzz Platform

## Overview

CampusBuzz is a full-stack campus event management platform. Students discover, register for, and
attend events; admins create events, scan QR codes at entry, and monitor analytics. The system is
built on Next.js 14 App Router with TypeScript strict mode, MongoDB/Mongoose 8.9.0, NextAuth.js
4.24.10 (JWT strategy), Tailwind CSS 3.4.17, Nodemailer 7.0.3, html5-qrcode 2.3.8, Recharts
3.8.1, and Framer Motion 11.15.0.

The implementation is divided into twelve ordered phases:
1. Constants (`src/lib/constants.ts`)
2. Database Models (User, Event, Registration, Payment, Waitlist)
3. Middleware + RBAC (`src/middleware.ts` + admin layout guard)
4. Bug Fixes (signup, atomic check-in, register route, MongoDB startup, checkin features, model manager)
5. Payment System (init, Khalti verify, eSewa callback, completeRegistration, admin cancel/refund)
6. Email Templates (5 templates in `src/lib/email.ts`)
7. Waitlist API + MinHeap wiring
8. Recommendations API wiring
9. Frontend Pages (landing, events list, event detail, my-events, my-payments, admin dashboard,
   admin events, admin scanner, admin payments, admin flagged)
10. Components (Navbar, EventCard, PaymentModal, DeleteModal, AdminSidebar)
11. Payment Pages (verify, failed)
12. Seed Script

---

## Architecture

### Next.js App Router Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout with SessionProvider
│   ├── providers.tsx               # NextAuth SessionProvider wrapper
│   ├── page.tsx                    # Landing page (public)
│   ├── globals.css                 # Tailwind base + custom CSS vars
│   ├── auth/
│   │   ├── login/page.tsx          # Student login
│   │   └── signup/page.tsx         # Student signup
│   ├── events/
│   │   ├── page.tsx                # Events listing (public)
│   │   └── [id]/page.tsx           # Event detail (public, actions require auth)
│   ├── my-events/page.tsx          # Student registrations (auth required)
│   ├── my-payments/page.tsx        # Student payment history (auth required)
│   ├── payment/
│   │   ├── verify/page.tsx         # Post-payment success page
│   │   └── failed/page.tsx         # Post-payment failure page
│   ├── admin/
│   │   ├── layout.tsx              # AdminLayout — sidebar + role guard
│   │   ├── page.tsx                # Redirect to /admin/dashboard
│   │   ├── login/page.tsx          # Admin login (bypasses AdminLayout guard)
│   │   ├── dashboard/page.tsx      # Stats + charts + events table
│   │   ├── events/
│   │   │   ├── new/page.tsx        # Create event form
│   │   │   └── [id]/
│   │   │       ├── edit/page.tsx   # Edit event form
│   │   │       └── view/page.tsx   # Event detail + attendee list
│   │   ├── scanner/page.tsx        # QR scanner (html5-qrcode)
│   │   ├── payments/page.tsx       # Payment management
│   │   ├── flagged/page.tsx        # Flagged check-ins review
│   │   └── analytics/page.tsx      # Analytics charts
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   └── signup/route.ts
│       ├── events/
│       │   ├── route.ts            # GET (list), POST (create)
│       │   └── [id]/route.ts       # GET, PATCH, DELETE
│       ├── register/route.ts       # POST (free events), DELETE, GET
│       ├── registrations/route.ts  # GET (student's registrations)
│       ├── checkin/route.ts        # POST (admin only)
│       ├── waitlist/route.ts       # POST, GET, DELETE
│       ├── recommendations/route.ts # GET
│       ├── payment/
│       │   ├── init/route.ts
│       │   ├── history/route.ts
│       │   ├── khalti/verify/route.ts
│       │   └── esewa/callback/route.ts
│       └── admin/
│           ├── stats/route.ts
│           ├── analytics/route.ts
│           ├── flagged/route.ts    # GET, PATCH
│           └── payments/
│               ├── route.ts        # GET
│               └── refund/route.ts # POST
├── components/
│   ├── Navbar.tsx
│   ├── EventCard.tsx
│   ├── PaymentModal.tsx
│   ├── DeleteModal.tsx
│   └── AdminSidebar.tsx            # (extracted from AdminLayout)
├── lib/
│   ├── constants.ts                # All magic values
│   ├── auth.ts                     # NextAuth options
│   ├── mongodb.ts                  # dbConnect + reconcile on startup
│   ├── email.ts                    # 5 Nodemailer templates
│   ├── payment.ts                  # initializePayment, verify*, completeRegistration
│   ├── rateLimit.ts                # In-memory sliding window
│   ├── reconcile.ts                # registeredCount correction
│   ├── algorithms/
│   │   ├── minHeap.ts              # Generic MinHeap<T>
│   │   └── waitlistManager.ts      # Heap ops + promoteTopWaitlistUser
│   ├── ml/
│   │   ├── isolationForest.ts      # IsolationForest implementation
│   │   ├── modelManager.ts         # Train, cache, retrain trigger
│   │   └── checkinFeatures.ts      # 6-element feature vector extractor
│   └── recommendations/
│       ├── recommender.ts          # Cosine similarity + TF-IDF
│       └── recommendationCache.ts  # In-memory TTL cache
├── models/
│   ├── User.ts
│   ├── Event.ts
│   ├── Registration.ts
│   ├── Payment.ts
│   └── Waitlist.ts
└── types/
    └── next-auth.d.ts              # Session type augmentation
```

### Request Flow

```
Browser → Next.js Middleware (JWT RBAC check)
       → App Router (Server/Client Components)
       → API Route Handler
       → dbConnect() [+ reconcile on first connect]
       → Mongoose Model
       → MongoDB Atlas
```

### Authentication Flow

NextAuth.js uses the JWT strategy. On login, the `authorize` callback fetches the User from
MongoDB, validates the bcrypt password, and returns `{ id, email, name, role }`. The `jwt`
callback embeds `id` and `role` into the JWT. The `session` callback copies them onto
`session.user`. The middleware reads the JWT directly via `getToken()` — zero DB round-trips.

```
POST /api/auth/callback/credentials
  → authorize() → bcrypt.compare → return { id, email, name, role }
  → jwt() → token.id = user.id; token.role = user.role
  → session() → session.user.id = token.id; session.user.role = token.role
```
