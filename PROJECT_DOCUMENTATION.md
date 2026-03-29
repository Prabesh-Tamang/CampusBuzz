# CampusBuzz (CampusBuzz) - Comprehensive Project Documentation

**Version**: 0.1.0  
**Last Updated**: March 2026  
**Author**: Development Team  
**Status**: Production-Ready

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Project Structure](#architecture--project-structure)
4. [Database Schema & Models](#database-schema--models)
5. [Configuration Files](#configuration-files)
6. [API Routes & Endpoints](#api-routes--endpoints)
7. [Component Architecture](#component-architecture)
8. [Authentication & Security](#authentication--security)
9. [Email & Notification System](#email--notification-system)
10. [QR Code Generation & Check-in Flow](#qr-code-generation--check-in-flow)
11. [Admin Dashboard & Analytics](#admin-dashboard--analytics)
12. [Testing Strategy & Test Cases](#testing-strategy--test-cases)
13. [Development Setup](#development-setup)
14. [Deployment Guidelines](#deployment-guidelines)
15. [Environment Variables Reference](#environment-variables-reference)
16. [Troubleshooting Guide](#troubleshooting-guide)
17. [Future Enhancements](#future-enhancements)

---

## Project Overview

### Purpose

**CampusBuzz** (internally named **CampusBuzz**) is a modern, full-stack campus event management platform designed to streamline event discovery, registration, and attendance tracking for college students and administrators.

### Key Objectives

- **Event Discovery**: Students can browse, search, and filter campus events
- **Event Registration**: Easy one-click registration with automatic QR code generation
- **Check-in System**: Admin-driven QR code scanning for attendance verification
- **Email Notifications**: Confirmation emails with embedded QR codes
- **Admin Dashboard**: Comprehensive event management and analytics
- **Role-Based Access**: Separate student and admin user flows

### Target Users

- **Students**: Event discovery, registration, event details
- **Administrators**: Event creation, management, attendance tracking, analytics

### Current Status

- **Phase**: MVP (Minimum Viable Product) Complete
- **Features**: Fully functional event management system
- **Data**: Seeded with demo data for testing

---

## Technology Stack

### Frontend Tier

| Component               | Technology      | Version | Purpose                            |
| ----------------------- | --------------- | ------- | ---------------------------------- |
| **Framework**           | Next.js         | 14.2.5  | Full-stack React with App Router   |
| **Language**            | TypeScript      | 5.x     | Type-safe development              |
| **UI Library**          | React           | 18.2.0  | Component-based UI                 |
| **Styling**             | Tailwind CSS    | 3.4.1   | Utility-first CSS framework        |
| **CSS Processing**      | PostCSS         | 8.x     | CSS transformation pipeline        |
| **CSS Vendor Prefixes** | Autoprefixer    | 10.0.1  | Browser compatibility              |
| **Animations**          | Framer Motion   | 11.2.12 | Advanced motion & page transitions |
| **Icons**               | lucide-react    | 0.400.0 | Consistent icon library            |
| **Icons Alt**           | react-icons     | 5.2.1   | Additional icon library            |
| **Notifications**       | react-hot-toast | 2.4.1   | Toast/notification system          |

### Backend Tier

| Component              | Technology         | Version       | Purpose                         |
| ---------------------- | ------------------ | ------------- | ------------------------------- |
| **API Framework**      | Next.js API Routes | 14.2.5        | Serverless function-based API   |
| **Authentication**     | NextAuth.js        | 4.24.13       | JWT-based session management    |
| **Database**           | MongoDB            | (Atlas/Local) | NoSQL document database         |
| **ORM/Schema**         | Mongoose           | 8.23.0        | MongoDB schema validation & ODM |
| **Password Hashing**   | bcryptjs           | 2.4.3         | Secure password encryption      |
| **QR Code Generation** | qrcode             | 1.5.3         | Backend QR generation           |
| **QR Code React**      | qrcode.react       | 3.1.0         | Frontend QR display             |
| **Email Service**      | Nodemailer         | 6.9.14        | SMTP email sending              |
| **Date Utilities**     | date-fns           | 2.30.0        | Date formatting & manipulation  |

### Development Tools

| Tool               | Version            | Purpose |
| ------------------ | ------------------ | ------- | -------------------------------- |
| **Linter**         | ESLint             | 8.x     | Code quality & style enforcement |
| **Next.js Config** | eslint-config-next | 14.2.5  | ESLint preset for Next.js        |
| **Node Types**     | @types/node        | 20.x    | TypeScript types for Node.js     |
| **React Types**    | @types/react       | 18.x    | TypeScript types for React       |

### Version Compatibility Matrix

```
Next.js 14.2.5
├── React 18.2.0
├── React DOM 18.2.0
├── NextAuth.js 4.24.13
├── Mongoose 8.23.0
├── Tailwind CSS 3.4.1
├── TypeScript 5.x
└── Framer Motion 11.2.12
```

**Notes**:

- All dependencies use caret (`^`) versioning for automatic minor/patch updates
- No major version conflicts detected
- MongoDB connection uses Atlas or local MongoDB instance

---

## Architecture & Project Structure

### Directory Tree

```
E:\Projects\CampusBuzz/
├── src/
│   ├── app/                           # Next.js App Router (Pages + API)
│   │   ├── layout.tsx                 # Root layout wrapper
│   │   ├── page.tsx                   # Homepage (/)
│   │   ├── globals.css                # Global styles & Tailwind imports
│   │   ├── providers.tsx              # NextAuth SessionProvider wrapper
│   │   │
│   │   ├── auth/                      # Authentication routes
│   │   │   ├── login/page.tsx         # Login form page
│   │   │   ├── signup/page.tsx        # Signup form page
│   │   │   └── register/page.tsx      # Alternative registration page
│   │   │
│   │   ├── events/                    # Event listing & details
│   │   │   ├── page.tsx               # Events grid with filters/search
│   │   │   └── [id]/page.tsx          # Individual event detail page
│   │   │
│   │   ├── my-events/                 # User's registered events
│   │   │   └── page.tsx               # User registrations dashboard
│   │   │
│   │   ├── dashboard/                 # Admin dashboard area
│   │   │   ├── page.tsx               # Dashboard home with stats
│   │   │   ├── events/page.tsx        # Event management interface
│   │   │   └── scanner/page.tsx       # QR code scanner page
│   │   │
│   │   ├── admin/                     # Legacy admin routes
│   │   │   ├── page.tsx               # Admin home
│   │   │   ├── scanner/page.tsx       # Admin QR scanner
│   │   │   └── events/new/page.tsx    # Create new event form
│   │   │
│   │   └── api/                       # API Routes
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts    # NextAuth OAuth handler
│   │       │   └── signup/route.ts           # POST user registration
│   │       │
│   │       ├── events/
│   │       │   ├── route.ts                  # GET events list, POST create
│   │       │   └── [id]/route.ts             # GET/PUT/DELETE by event ID
│   │       │
│   │       ├── register/route.ts             # POST register + QR gen, GET user's registrations
│   │       ├── registrations/route.ts        # GET user registrations (alternate)
│   │       ├── checkin/route.ts              # POST QR validation for check-in
│   │       └── admin/
│   │           └── stats/route.ts            # GET dashboard statistics
│   │
│   ├── components/                    # Reusable React components
│   │   ├── Navbar.tsx                 # Navigation bar with auth UI
│   │   └── EventCard.tsx              # Event card component with animations
│   │
│   ├── lib/                           # Utility libraries & configurations
│   │   ├── mongodb.ts                 # MongoDB connection handler (cached)
│   │   ├── auth.ts                    # NextAuth configuration & options
│   │   └── email.ts                   # Nodemailer email service setup
│   │
│   └── models/                        # Mongoose schemas & models
│       ├── User.ts                    # User model (Student/Admin)
│       ├── Event.ts                   # Event model with categories
│       └── Registration.ts            # Registration/ticket model
│
├── scripts/
│   └── seed.js                        # Database seeding script (demo data)
│
├── Configuration Files (Root)
│   ├── package.json                   # NPM dependencies & scripts
│   ├── package-lock.json              # Locked dependency versions
│   ├── tsconfig.json                  # TypeScript compiler options
│   ├── next.config.mjs                # Next.js configuration
│   ├── tailwind.config.js             # Tailwind CSS customization
│   ├── postcss.config.js              # PostCSS plugins
│   ├── .env.example                   # Environment variables template
│   └── .env.local                     # Local environment (git-ignored)
│
├── next-env.d.ts                      # Next.js type definitions
├── README.md                          # Project README
├── structure.txt                      # Directory structure reference
└── node_modules/                      # Installed dependencies
```

### Architecture Layers

```
┌─────────────────────────────────────────┐
│         Next.js App Router              │
│  (Pages + API Routes in /src/app)       │
├─────────────────────────────────────────┤
│         React Components                │
│  (Navbar, EventCard, Forms, etc.)       │
├─────────────────────────────────────────┤
│      Business Logic & Services          │
│  (lib/ folder: auth, email, mongodb)    │
├─────────────────────────────────────────┤
│    Data Models (Mongoose Schemas)       │
│  (User, Event, Registration)            │
├─────────────────────────────────────────┤
│      MongoDB Database                   │
│  (Collections: users, events, ...)      │
└─────────────────────────────────────────┘
```

### Key Design Patterns

1. **Server-Side Session Management**: NextAuth.js with JWT tokens
2. **Cached Database Connection**: Mongoose singleton pattern to prevent pool exhaustion
3. **Component Composition**: Reusable components for events, forms, and UI
4. **API-Driven Architecture**: Next.js API routes for all backend operations
5. **Environment-Based Configuration**: Settings loaded from `.env.local`

---

## Database Schema & Models

### Database Name

- **MongoDB Database**: `CampusBuzz`
- **Connection Type**: Mongoose ODM with automatic schema validation

### Collection 1: Users

**Purpose**: Store user account information with role-based access

```typescript
interface IUser extends Document {
  _id: ObjectId; // Auto-generated by MongoDB
  name: string; // User's full name (required)
  email: string; // Unique email (required, lowercase)
  password: string; // Bcrypt hashed password (required)
  role: "student" | "admin"; // User role (default: 'student')
  college: string; // College/university name (default: '')
  createdAt: Date; // Auto-set creation timestamp
  updatedAt: Date; // Auto-updated modification timestamp
}
```

**Schema Details**:

```javascript
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  college: { type: String, default: '' }
}
```

**Indexes**:

- `email` (unique) - Fast lookup by email for login

**Sample Document**:

```json
{
  "_id": "ObjectId('507f1f77bcf86cd799439011')",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$2a$12$...",
  "role": "student",
  "college": "MIT",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-15T14:30:00.000Z"
}
```

---

### Collection 2: Events

**Purpose**: Store campus event information with capacity tracking

```typescript
interface IEvent extends Document {
  _id: ObjectId; // Auto-generated by MongoDB
  title: string; // Event name (required)
  description: string; // Event details (required)
  category: string; // Event category (enum)
  date: Date; // Event start date-time (required)
  endDate: Date; // Event end date-time (required)
  venue: string; // Location/venue name (required)
  capacity: number; // Max registrations (default: 100)
  registeredCount: number; // Current registrations (default: 0)
  imageUrl: string; // Event poster/image URL (default: '')
  organizer: string; // Organizing club/department (required)
  tags: string[]; // Search tags/keywords
  isActive: boolean; // Event visibility flag (default: true)
  createdBy: ObjectId; // Admin who created event (ref: User)
  createdAt: Date; // Auto-set creation timestamp
  updatedAt: Date; // Auto-updated modification timestamp
}
```

**Category Enum Values**:

- `Technical` - Coding, hackathons, tech talks
- `Cultural` - Festivals, concerts, performances
- `Sports` - Athletic events, tournaments
- `Workshop` - Training, seminars, courses
- `Seminar` - Talks, lectures, presentations
- `Other` - Miscellaneous events

**Schema Details**:

```javascript
{
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'],
    default: 'Other'
  },
  date: { type: Date, required: true },
  endDate: { type: Date, required: true },
  venue: { type: String, required: true },
  capacity: { type: Number, required: true, default: 100 },
  registeredCount: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' },
  organizer: { type: String, required: true },
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}
```

**Indexes**:

- None explicitly defined (MongoDB creates default `_id` index)
- Query optimization: `isActive: true` used in most queries

**Sample Document**:

```json
{
  "_id": "ObjectId('507f1f77bcf86cd799439012')",
  "title": "AI & Machine Learning Summit",
  "description": "Learn latest trends in AI/ML from industry experts",
  "category": "Technical",
  "date": "2026-04-15T14:00:00.000Z",
  "endDate": "2026-04-15T18:00:00.000Z",
  "venue": "Main Auditorium, Building A",
  "capacity": 500,
  "registeredCount": 342,
  "imageUrl": "https://example.com/events/ai-summit.jpg",
  "organizer": "Computer Science Club",
  "tags": ["AI", "ML", "Tech", "Talk"],
  "isActive": true,
  "createdBy": "ObjectId('507f1f77bcf86cd799439011')",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-25T12:00:00.000Z"
}
```

---

### Collection 3: Registrations

**Purpose**: Track event registrations with QR codes for check-in

```typescript
interface IRegistration extends Document {
  _id: ObjectId; // Auto-generated by MongoDB
  userId: ObjectId; // Reference to User (required)
  eventId: ObjectId; // Reference to Event (required)
  registrationId: string; // Unique ticket ID (required, unique)
  qrCode: string; // Base64 encoded QR code (required)
  checkedIn: boolean; // Attendance verification (default: false)
  checkedInAt?: Date; // Check-in timestamp (optional)
  createdAt: Date; // Registration date-time
  updatedAt: Date; // Last modification date-time
}
```

**Schema Details**:

```javascript
{
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  registrationId: { type: String, required: true, unique: true },
  qrCode: { type: String, required: true },
  checkedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date }
}

// Compound unique index to prevent duplicate registrations
RegistrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
```

**Indexes**:

- `registrationId` (unique) - Fast QR code lookup
- `userId + eventId` (unique compound) - Prevent duplicate registrations
- Implicit index on `_id`

**Registration ID Format**:

- Pattern: `CP-[TIMESTAMP]-[RANDOM]`
- Example: `CP-A1B2C3D-4E5F`
- Generated by function: `generateRegistrationId()`

**QR Code Data Structure**:
The QR code encodes this JSON as a Base64-encoded PNG image:

```json
{
  "registrationId": "CP-A1B2C3D-4E5F",
  "eventId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011"
}
```

**Sample Document**:

```json
{
  "_id": "ObjectId('507f1f77bcf86cd799439013')",
  "userId": "ObjectId('507f1f77bcf86cd799439011')",
  "eventId": "ObjectId('507f1f77bcf86cd799439012')",
  "registrationId": "CP-A1B2C3D-4E5F",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "checkedIn": true,
  "checkedInAt": "2026-04-15T14:30:00.000Z",
  "createdAt": "2026-03-25T11:00:00.000Z",
  "updatedAt": "2026-04-15T14:30:00.000Z"
}
```

### Entity Relationship Diagram (ERD)

```
┌──────────────┐         ┌──────────────┐
│   Users      │         │    Events    │
├──────────────┤         ├──────────────┤
│ _id (PK)     │         │ _id (PK)     │
│ name         │         │ title        │
│ email        │         │ date         │
│ password     │    ┌────│ createdBy    │─────┐
│ role         │    │    │ capacity     │     │
│ college      │    │    │ registeredCnt│     │
└──────────────┘    │    └──────────────┘     │
       ▲            │                          │
       │            │                          │
       │ (1:N)      │ (1:N)                   │
       │            │                          │
       │            │ userId                   │ eventId
       │            │                          │
    ┌──┴────────────┴──────────────────────┐  │
    │      Registrations                   │  │
    ├──────────────────────────────────────┤  │
    │ _id (PK)                             │  │
    │ registrationId (Unique)              │◄─┘
    │ userId (FK) ──────────────────┐      │
    │ eventId (FK) ──────────────────┤─────┤
    │ qrCode                        │      │
    │ checkedIn                     │      │
    │ checkedInAt                   │      │
    └───────────────────────────────┘      │
                                           │
    Compound Unique Index:                 │
    (userId + eventId)  ◄──────────────────┘
```

### Data Relationships

1. **User → Events** (One-to-Many)
   - One user (admin) can create many events
   - Foreign Key: `Event.createdBy`

2. **User → Registrations** (One-to-Many)
   - One user can have many registrations
   - Foreign Key: `Registration.userId`

3. **Event → Registrations** (One-to-Many)
   - One event can have many registrations
   - Foreign Key: `Registration.eventId`

4. **Registrations → Unique Constraint**
   - Compound index ensures no duplicate (user, event) pairs
   - Prevents double registration

---

## Configuration Files

### package.json

**Location**: `E:\Projects\CampusBuzz\package.json`

```json
{
  "name": "CampusBuzz",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "date-fns": "^2.30.0",
    "framer-motion": "^11.2.12",
    "lucide-react": "^0.400.0",
    "mongoose": "^8.23.0",
    "next": "^14.2.5",
    "next-auth": "^4.24.13",
    "nodemailer": "^6.9.14",
    "qrcode": "^1.5.3",
    "qrcode.react": "^3.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hot-toast": "^2.4.1",
    "react-icons": "^5.2.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/nodemailer": "^6.4.15",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.5",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

**Key Scripts**:

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript and optimize for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality

---

### tsconfig.json

**Location**: `E:\Projects\CampusBuzz\tsconfig.json`

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "target": "ES2017"
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Key Settings**:

- `strict: true` - Enforce strict type checking
- `jsx: "preserve"` - Preserve JSX for Next.js processing
- `@/*` path alias - Clean imports from src folder
- `target: ES2017` - Compatible with modern browsers
- `moduleResolution: "bundler"` - Modern module resolution

---

### next.config.mjs

**Location**: `E:\Projects\CampusBuzz\next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turboPackFileSystem: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
      },
    ],
  },
};

export default nextConfig;
```

**Configuration Details**:

- **Turbopack**: Experimental faster Rust-based bundler for faster builds
- **Remote Images**: Allowed from `example.com` domain for image optimization
- **Incremental Static Regeneration**: Enabled by default in Next.js 14

---

### tailwind.config.js

**Location**: `E:\Projects\CampusBuzz\tailwind.config.js`

```javascript
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-syne)", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
        display: ["var(--font-clash)", "sans-serif"],
      },
      colors: {
        pulse: {
          50: "#f0fdf9",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#134e4a",
          900: "#0f3633",
          950: "#051e1b",
        },
        coral: {
          400: "#fb7185",
          500: "#f43f5e",
        },
        amber: {
          400: "#fbbf24",
          500: "#f59e0b",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-left": "slideLeft 0.5s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideLeft: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
```

**Design System**:

- **Primary Color**: Teal (`pulse-500` = `#14b8a6`)
- **Accent Colors**: Coral (`#f43f5e`), Amber (`#f59e0b`)
- **Dark Mode**: Class-based dark mode support
- **Custom Animations**: 5 custom animations for UI effects
- **Typography**: Custom fonts (Syne, Space Mono, Clash)

---

### postcss.config.js

**Location**: `E:\Projects\CampusBuzz\postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Purpose**:

- Processes Tailwind CSS utility classes
- Adds vendor prefixes for browser compatibility

---

### .env.example

**Location**: `E:\Projects\CampusBuzz\.env.example`

```env
# MongoDB Connection String
# For local MongoDB:
MONGODB_URI=mongodb://127.0.0.1:27017/CampusBuzz

# For MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/CampusBuzz

# NextAuth Configuration
NEXTAUTH_SECRET=your-super-secret-key-here-change-this
NEXTAUTH_URL=http://localhost:3000

# Email Configuration (Gmail SMTP)
EMAIL_USER=test@gmail.com
EMAIL_PASS=Test@123

# Admin Setup
ADMIN_EMAIL=admin@CampusBuzz.com
```

---

## API Routes & Endpoints

### Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

All API responses use JSON format with standard HTTP status codes.

---

### Authentication Endpoints

#### 1. NextAuth Handler

**Route**: `GET/POST /api/auth/[...nextauth]`

**Purpose**: OAuth flow handler for NextAuth.js

**Supported Methods**:

- GET: Session information, CSRF token, providers
- POST: Sign-in, sign-out, callback handling

**No Request Body Required**

**Response** (on GET):

```json
{
  "providers": {
    "credentials": { "id": "credentials", "name": "Credentials" }
  },
  "csrfToken": "token-value"
}
```

**Usage**:

```typescript
// Client-side
import { signIn, signOut } from "next-auth/react";

await signIn("credentials", { email: "user@example.com", password: "pass123" });
await signOut();
```

---

#### 2. User Signup

**Route**: `POST /api/auth/signup`

**Purpose**: Create new user account (auto-detects admin role)

**Authentication**: None (Public endpoint)

**Request Body**:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "college": "MIT"
}
```

**Response** (201 Created):

```json
{
  "message": "Account created",
  "userId": "507f1f77bcf86cd799439011"
}
```

**Response** (400 Bad Request):

```json
{
  "error": "Missing required fields"
}
```

**Response** (409 Conflict):

```json
{
  "error": "Email already registered"
}
```

**Auto-Admin Detection**:

- If `email === process.env.ADMIN_EMAIL`, role is set to `'admin'`
- Otherwise, role defaults to `'student'`

**Password Security**:

- Hashed with bcryptjs (12 salt rounds)
- Never sent back in response

---

### Event Endpoints

#### 3. Get Events List

**Route**: `GET /api/events`

**Purpose**: Fetch all active events with optional filters

**Authentication**: None (Public endpoint)

**Query Parameters**:

```
?category=Technical&search=summit
```

- `category` (optional): Filter by category (`Technical`, `Cultural`, `Sports`, `Workshop`, `Seminar`, `Other`)
- `search` (optional): Case-insensitive search by title

**Response** (200 OK):

```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "title": "AI & Machine Learning Summit",
    "description": "Learn latest trends in AI/ML",
    "category": "Technical",
    "date": "2026-04-15T14:00:00.000Z",
    "endDate": "2026-04-15T18:00:00.000Z",
    "venue": "Main Auditorium",
    "capacity": 500,
    "registeredCount": 342,
    "imageUrl": "https://example.com/ai-summit.jpg",
    "organizer": "CS Club",
    "tags": ["AI", "ML"],
    "isActive": true,
    "createdBy": "507f1f77bcf86cd799439011",
    "createdAt": "2026-03-01T10:00:00.000Z",
    "updatedAt": "2026-03-25T12:00:00.000Z"
  }
]
```

**Filters Applied**:

- Only active events (`isActive: true`)
- Sorted by date (ascending)
- Lean query (improved performance)

---

#### 4. Create Event

**Route**: `POST /api/events`

**Purpose**: Create new event (admin-only)

**Authentication**: Required (Admin role only)

**Request Body**:

```json
{
  "title": "Web Development Bootcamp",
  "description": "Learn web development fundamentals",
  "category": "Workshop",
  "date": "2026-05-01T10:00:00.000Z",
  "endDate": "2026-05-01T14:00:00.000Z",
  "venue": "Computer Lab, Building B",
  "capacity": 150,
  "imageUrl": "https://example.com/webdev.jpg",
  "organizer": "Web Dev Club",
  "tags": ["Web", "Development", "Workshop"]
}
```

**Response** (201 Created):

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "title": "Web Development Bootcamp",
  "description": "Learn web development fundamentals",
  "category": "Workshop",
  "date": "2026-05-01T10:00:00.000Z",
  "endDate": "2026-05-01T14:00:00.000Z",
  "venue": "Computer Lab, Building B",
  "capacity": 150,
  "registeredCount": 0,
  "imageUrl": "https://example.com/webdev.jpg",
  "organizer": "Web Dev Club",
  "tags": ["Web", "Development", "Workshop"],
  "isActive": true,
  "createdBy": "507f1f77bcf86cd799439011",
  "createdAt": "2026-03-25T15:00:00.000Z",
  "updatedAt": "2026-03-25T15:00:00.000Z"
}
```

**Response** (401 Unauthorized):

```json
{
  "error": "Unauthorized"
}
```

**Authorization Check**:

- Session must exist
- User role must be `'admin'`

---

#### 5. Get Event Details

**Route**: `GET /api/events/[id]`

**Purpose**: Fetch single event by ID

**Authentication**: None (Public endpoint)

**URL Parameters**:

- `id`: Event MongoDB ObjectId

**Response** (200 OK):

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "AI & Machine Learning Summit",
  "description": "Learn latest trends in AI/ML",
  "category": "Technical",
  "date": "2026-04-15T14:00:00.000Z",
  "endDate": "2026-04-15T18:00:00.000Z",
  "venue": "Main Auditorium",
  "capacity": 500,
  "registeredCount": 342,
  "imageUrl": "https://example.com/ai-summit.jpg",
  "organizer": "CS Club",
  "tags": ["AI", "ML"],
  "isActive": true,
  "createdBy": "507f1f77bcf86cd799439011",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-25T12:00:00.000Z"
}
```

**Response** (404 Not Found):

```json
{
  "error": "Event not found"
}
```

---

#### 6. Update Event

**Route**: `PUT /api/events/[id]`

**Purpose**: Update event details (admin-only)

**Authentication**: Required (Admin role only)

**Request Body** (all fields optional):

```json
{
  "title": "Updated Event Name",
  "description": "Updated description",
  "date": "2026-05-01T15:00:00.000Z",
  "capacity": 200
}
```

**Response** (200 OK):

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Updated Event Name",
  ...
}
```

---

#### 7. Delete Event

**Route**: `DELETE /api/events/[id]`

**Purpose**: Delete event (admin-only)

**Authentication**: Required (Admin role only)

**Response** (200 OK):

```json
{
  "success": true
}
```

---

### Registration Endpoints

#### 8. Register for Event

**Route**: `POST /api/register`

**Purpose**: Register user for event with QR code generation and email

**Authentication**: Required (Session must exist)

**Request Body**:

```json
{
  "eventId": "507f1f77bcf86cd799439012"
}
```

**Response** (201 Created):

```json
{
  "registration": {
    "_id": "507f1f77bcf86cd799439014",
    "userId": "507f1f77bcf86cd799439011",
    "eventId": "507f1f77bcf86cd799439012",
    "registrationId": "CP-A1B2C3D-4E5F",
    "qrCode": "data:image/png;base64,iVBORw0KG...",
    "checkedIn": false,
    "createdAt": "2026-03-25T15:30:00.000Z",
    "updatedAt": "2026-03-25T15:30:00.000Z"
  },
  "qrCode": "data:image/png;base64,iVBORw0KG..."
}
```

**Response** (400 Bad Request):

```json
{
  "error": "Event is full"
}
```

**Response** (409 Conflict):

```json
{
  "error": "Already registered"
}
```

**Side Effects**:

1. Creates registration document
2. Generates unique QR code with registration data
3. Increments `event.registeredCount` by 1
4. Sends confirmation email with embedded QR code

---

#### 9. Get User Registrations

**Route**: `GET /api/register`

**Purpose**: Fetch user's event registrations with populated event data

**Authentication**: Required (Session must exist)

**Response** (200 OK):

```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "userId": "507f1f77bcf86cd799439011",
    "eventId": {
      "_id": "507f1f77bcf86cd799439012",
      "title": "AI & Machine Learning Summit",
      "date": "2026-04-15T14:00:00.000Z",
      "venue": "Main Auditorium",
      ...
    },
    "registrationId": "CP-A1B2C3D-4E5F",
    "qrCode": "data:image/png;base64,iVBORw0KG...",
    "checkedIn": false,
    "createdAt": "2026-03-25T15:30:00.000Z"
  }
]
```

**Population**: Event details auto-populated in eventId field

---

### Check-in Endpoints

#### 10. QR Code Check-in

**Route**: `POST /api/checkin`

**Purpose**: Validate QR code and mark attendance (admin-only)

**Authentication**: Required (Admin role only)

**Request Body**:

```json
{
  "registrationId": "CP-A1B2C3D-4E5F"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "registration": {
    "_id": "507f1f77bcf86cd799439014",
    "userId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "eventId": {
      "_id": "507f1f77bcf86cd799439012",
      "title": "AI & Machine Learning Summit"
    },
    "registrationId": "CP-A1B2C3D-4E5F",
    "checkedIn": true,
    "checkedInAt": "2026-04-15T14:15:00.000Z"
  }
}
```

**Response** (400 Bad Request):

```json
{
  "error": "Already checked in",
  "registration": { ... }
}
```

**Response** (404 Not Found):

```json
{
  "error": "Invalid QR code"
}
```

**Validation**:

- Registration must exist
- Must not already be checked in
- Only admins can check in

---

### Admin Statistics Endpoint

#### 11. Dashboard Statistics

**Route**: `GET /api/admin/stats`

**Purpose**: Fetch dashboard analytics (admin-only)

**Authentication**: Required (Admin role only)

**Response** (200 OK):

```json
{
  "totalEvents": 6,
  "totalStudents": 45,
  "totalRegistrations": 258,
  "totalCheckIns": 184,
  "recentEvents": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "AI & Machine Learning Summit",
      "registeredCount": 342,
      "createdAt": "2026-03-25T15:30:00.000Z"
    }
  ]
}
```

**Stats Calculated**:

- Total active events (isActive: true)
- Unique student count
- Total registrations across all events
- Total check-ins across all registrations

---

## Component Architecture

### Navbar Component

**File**: `src/components/Navbar.tsx`

**Type**: Client Component (`'use client'`)

**Props**: None (uses NextAuth hooks)

**Dependencies**:

- `next-auth/react` - Session management
- `next/link` - Client navigation
- `lucide-react` - Icons

**Key Features**:

1. **Logo Section**: CampusBuzz branding with gradient icon
2. **Navigation Links**: Events link, Dashboard (admin-only)
3. **Auth State Handling**:
   - If authenticated: User avatar + name + Admin badge + Sign Out
   - If unauthenticated: Login + Sign Up buttons
4. **Admin Detection**: Shows dashboard link only for role === 'admin'

**Key Functions**:

```typescript
const isAdmin = session?.user?.role === "admin";
```

**Styling Classes**:

- `.sticky top-0 z-50` - Sticky header
- `.bg-[#050d0c]/85 backdrop-blur-xl` - Dark glass effect
- `.border-b border-border` - Bottom border
- `.btn-primary` / `.btn-ghost` - Button styles

**Responsive Design**:

- Flexbox layout for responsive alignment
- Mobile-friendly padding and spacing

---

### EventCard Component

**File**: `src/components/EventCard.tsx`

**Type**: Client Component (`'use client'`)

**Props**:

```typescript
interface EventCardProps {
  event: IEvent;
  onRegister?: (eventId: string) => void;
}
```

**Dependencies**:

- `framer-motion` - Animations
- `date-fns` - Date formatting
- `react-icons` - Icons
- `next/link` - Navigation

**Key Features**:

1. **Event Display**:
   - Title, description, category badge
   - Date/time, venue, organizer
2. **Capacity Indicator**:
   - Progress bar with color coding:
     - Green (0-50% full)
     - Yellow (50-80% full)
     - Red (80-100% full)
   - Displays "X spots left" or "Event Full"
3. **Category Badge**: Styled by category type
4. **Animations**:
   - Fade-up on mount (via parent container)
   - Hover lift effect (via Framer Motion)
5. **CTA Button**:
   - "View & Register" (if available)
   - "Event Full" (if at capacity)

**Code Example**:

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ y: -4 }}
  className="card"
>
  <h3 className="text-lg font-bold">{event.title}</h3>
  <p className="text-sm text-gray-400">{event.description}</p>
  <div className="progress-bar">
    <div style={{ width: `${(event.registeredCount / event.capacity) * 100}%` }} />
  </div>
  <button className="btn-primary">
    {event.registeredCount >= event.capacity ? 'Event Full' : 'View & Register'}
  </button>
</motion.div>
```

**Styling**:

- Uses Tailwind utility classes
- Custom animation classes from tailwind.config.js
- Responsive grid layout

---

## Authentication & Security

### Authentication Flow

**Strategy**: JWT (JSON Web Token) with NextAuth.js

```
┌─────────────────────────────────────────────┐
│ User visits /auth/login                     │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ User enters email & password                │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Credentials sent to NextAuth                │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Credentials provider validates:             │
│ - Email exists in DB                        │
│ - Password matches (bcrypt compare)         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ JWT token created with:                     │
│ - user.id                                   │
│ - user.email                                │
│ - user.role                                 │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Session callback enriches session object    │
│ - Adds role to session.user                 │
│ - Adds id to session.user                   │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ User authenticated with JWT cookie          │
└─────────────────────────────────────────────┘
```

### Security Features

#### 1. Password Hashing

```typescript
// Signup: Hash password with 12 salt rounds
const hashed = await bcrypt.hash(password, 12);

// Login: Compare provided password with hash
const isValid = await bcrypt.compare(credentials.password, user.password);
```

**Salt Rounds**: 12 (takes ~100-150ms per hash, secure against brute force)

#### 2. JWT Secret

```env
NEXTAUTH_SECRET=your-super-secret-key-here-change-this
```

**Importance**:

- Signs all JWT tokens
- Must be cryptographically secure (32+ characters)
- Never expose in client-side code

#### 3. Session Strategy

```typescript
session: {
  strategy: "jwt";
}
```

- Uses JWT tokens instead of database sessions
- Stateless authentication (scalable)
- Token expires after configured period

#### 4. Authorization Checks

All admin endpoints verify:

```typescript
const session = await getServerSession(authOptions);
if (!session || session.user.role !== "admin") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

#### 5. Email Uniqueness

```typescript
// Prevent duplicate accounts
const existing = await User.findOne({ email });
if (existing) {
  return NextResponse.json(
    { error: "Email already registered" },
    { status: 409 },
  );
}
```

#### 6. Duplicate Registration Prevention

```typescript
// Compound unique index on registrations
RegistrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
```

### Session Data Structure

```typescript
interface Session {
  user: {
    email: string;
    name: string;
    role: "student" | "admin"; // Added by callback
    id: string; // Added by callback
  };
  expires: Date;
}
```

---

## Email & Notification System

### Email Service Setup

**Service**: Nodemailer with Gmail SMTP

**Configuration** (`src/lib/email.ts`):

```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App-specific password
  },
});

export async function sendRegistrationEmail({
  to,
  name,
  eventName,
  eventDate,
  eventVenue,
  qrCodeDataUrl,
  registrationId,
}) {
  const htmlContent = `
    <h2>Event Registration Confirmation</h2>
    <p>Hi ${name},</p>
    <p>You have successfully registered for <strong>${eventName}</strong></p>
    <p><strong>Date:</strong> ${eventDate}</p>
    <p><strong>Venue:</strong> ${eventVenue}</p>
    <p><strong>Registration ID:</strong> ${registrationId}</p>
    <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 200px;" />
    <p>Please bring this QR code to the event for check-in.</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `Registration Confirmed: ${eventName}`,
    html: htmlContent,
  });
}
```

### Email Triggers

#### Registration Confirmation Email

- **Trigger**: User successfully registers for event
- **Recipient**: Registered user email
- **Content**:
  - Event name, date, venue
  - Registration ID
  - Embedded QR code (base64 data URL)
  - Check-in instructions

**Email Template Structure**:

```html
<h2>Event Registration Confirmation</h2>
<p>Hi {name},</p>
<p>You have successfully registered for {eventName}</p>
<p><strong>Date:</strong> {eventDate}</p>
<p><strong>Venue:</strong> {eventVenue}</p>
<p><strong>Registration ID:</strong> {registrationId}</p>
<img src="{qrCodeDataUrl}" alt="QR Code" style="max-width: 200px;" />
<p>Please bring this QR code to the event for check-in.</p>
```

### Email Service Provider Setup

**Gmail Configuration**:

1. Create Google Account
2. Enable 2-Factor Authentication
3. Generate App-Specific Password
4. Set environment variables:
   - `EMAIL_USER` = Gmail address
   - `EMAIL_PASS` = App-specific password

**Alternative**: Use SendGrid, Mailgun, or AWS SES by updating transporter config

### Toast Notifications

**Library**: `react-hot-toast`

**Usage**:

```typescript
import toast from "react-hot-toast";

toast.success("Successfully registered!");
toast.error("Failed to register. Already registered?");
toast.loading("Processing...");
```

**Positions**: Top-right, bottom-center, etc.

---

## QR Code Generation & Check-in Flow

### QR Code Generation Process

**Step 1: Generate Unique Registration ID**

```typescript
function generateRegistrationId() {
  return (
    "CP-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}
// Example: CP-A1B2C3D-4E5F
```

**Step 2: Create QR Data JSON**

```json
{
  "registrationId": "CP-A1B2C3D-4E5F",
  "eventId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011"
}
```

**Step 3: Generate QR Code PNG**

```typescript
import QRCode from "qrcode";

const qrData = JSON.stringify({ registrationId, eventId, userId });
const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
  width: 300,
  margin: 2,
  errorCorrectionLevel: "H", // High error correction
});
// Result: data:image/png;base64,iVBORw0KGgoAAAANSU...
```

**Step 4: Store in Database**

```typescript
await Registration.create({
  userId,
  eventId,
  registrationId,
  qrCode: qrCodeDataUrl, // Base64 PNG string
  checkedIn: false,
});
```

**Step 5: Send in Email**

```typescript
await sendRegistrationEmail({
  to: user.email,
  qrCodeDataUrl,  // Embedded in email HTML
  ...
});
```

### QR Code Display Flow

**On `/my-events` Page**:

```typescript
registration.qrCode; // Display as <img src={qrCode} />
```

**On `/dashboard/scanner` Page**:

```typescript
// Admin scans with camera using browser API
// QR code parser extracts: { registrationId, eventId, userId }
```

### Check-in Process

```
┌──────────────────────────────┐
│ Admin at check-in counter    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Opens /dashboard/scanner     │
│ Allows camera access        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Scans QR code with camera   │
│ Extracts: registrationId    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ POST /api/checkin           │
│ { registrationId }          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Server validates:            │
│ - Registration exists        │
│ - Not already checked in     │
│ - User is authenticated      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Update registration:         │
│ - checkedIn = true           │
│ - checkedInAt = now()        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Return success with          │
│ attendee name & event        │
└──────────────────────────────┘
```

### Check-in Validation

```typescript
// Find registration by scanned ID
const registration = await Registration.findOne({ registrationId })
  .populate("userId")
  .populate("eventId");

// Validate
if (!registration) {
  // QR code is invalid/fake
  return error("Invalid QR code");
}

if (registration.checkedIn) {
  // Already checked in (prevent double entries)
  return error("Already checked in");
}

// Mark as checked in
registration.checkedIn = true;
registration.checkedInAt = new Date();
await registration.save();

return success(registration);
```

---

## Admin Dashboard & Analytics

### Dashboard Home (`/dashboard`)

**Features**:

1. **Statistics Cards**:
   - Total Events
   - Total Students
   - Total Registrations
   - Total Check-ins

2. **Recent Events List**:
   - Event name
   - Registration count
   - Creation date

3. **Navigation**:
   - Link to Event Management (`/dashboard/events`)
   - Link to QR Scanner (`/dashboard/scanner`)

**Data Source**: `GET /api/admin/stats`

### Event Management (`/dashboard/events`)

**Features**:

1. **Event List**:
   - Title, date, capacity, registered count
   - Registered percentage
   - Actions: Edit, Delete

2. **Create Event Button**:
   - Opens form with fields:
     - Title, Description, Category
     - Date, End Date
     - Venue, Capacity
     - Image URL, Organizer, Tags

3. **Edit Event**:
   - Pre-fill existing data
   - Update event details

4. **Delete Event**:
   - Remove event from system
   - Update registeredCount if needed

### QR Scanner (`/dashboard/scanner`)

**Features**:

1. **Camera Access**:
   - Request browser camera permission
   - Display camera feed

2. **QR Code Detection**:
   - Automatic scanning
   - Extract registration data

3. **Check-in Feedback**:
   - Success message with attendee name
   - Error message if already checked in
   - Handle invalid QR codes

4. **Recent Check-ins**:
   - Display last 10 check-ins
   - Name, event, time

---

## Testing Strategy & Test Cases

### Testing Framework Setup

We recommend a three-tier testing approach:

#### Tier 1: Unit Tests (Jest)

- Test individual functions, utilities, and components
- Fast execution, high coverage
- No external dependencies

#### Tier 2: Integration Tests (Vitest)

- Test API routes, database interactions
- Test component interactions with API
- Moderate execution time

#### Tier 3: End-to-End Tests (Cypress)

- Test complete user flows
- Test entire application UI
- Slower execution, highest confidence

### Installation Commands

```bash
# Jest for unit testing
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Vitest for integration testing
npm install --save-dev vitest @vitest/ui

# Cypress for E2E testing
npm install --save-dev cypress
```

### Jest Configuration

**File**: `jest.config.js`

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
```

### Test Case Examples

#### Unit Test: Password Hashing

**File**: `src/lib/__tests__/auth.test.ts`

```typescript
import bcrypt from "bcryptjs";

describe("Password Hashing", () => {
  test("should hash password with 12 rounds", async () => {
    const password = "SecurePass123!";
    const hashed = await bcrypt.hash(password, 12);

    expect(hashed).not.toBe(password);
    expect(hashed).toMatch(/^\$2[aby]\$/); // Bcrypt prefix
    expect(hashed.length).toBeGreaterThan(20);
  });

  test("should verify matching password", async () => {
    const password = "SecurePass123!";
    const hashed = await bcrypt.hash(password, 12);

    const isValid = await bcrypt.compare(password, hashed);
    expect(isValid).toBe(true);
  });

  test("should reject non-matching password", async () => {
    const password = "SecurePass123!";
    const hashed = await bcrypt.hash(password, 12);

    const isValid = await bcrypt.compare("WrongPassword", hashed);
    expect(isValid).toBe(false);
  });
});
```

#### Unit Test: Event Model Validation

**File**: `src/models/__tests__/Event.test.ts`

```typescript
import Event from "@/models/Event";

describe("Event Model", () => {
  test("should require title, description, date, endDate, venue, organizer", async () => {
    const invalidEvent = new Event({
      title: "AI Summit",
      // Missing other required fields
    });

    expect(async () => await invalidEvent.save()).rejects.toThrow();
  });

  test('should set default category to "Other"', () => {
    const event = new Event({
      title: "Tech Meetup",
      description: "Meet fellow developers",
      date: new Date("2026-05-01"),
      endDate: new Date("2026-05-01"),
      venue: "Main Hall",
      organizer: "Tech Club",
    });

    expect(event.category).toBe("Other");
  });

  test("should validate category enum", async () => {
    const event = new Event({
      title: "Event",
      description: "Test",
      date: new Date(),
      endDate: new Date(),
      venue: "Hall",
      organizer: "Club",
      category: "InvalidCategory",
    });

    expect(async () => await event.save()).rejects.toThrow();
  });

  test("should have default registeredCount of 0", () => {
    const event = new Event({
      title: "Event",
      description: "Test",
      date: new Date(),
      endDate: new Date(),
      venue: "Hall",
      organizer: "Club",
    });

    expect(event.registeredCount).toBe(0);
  });
});
```

#### Integration Test: Event Registration API

**File**: `src/app/api/register/__tests__/route.test.ts`

```typescript
import { POST as registerEvent } from "@/app/api/register/route";
import { getServerSession } from "next-auth";
import Registration from "@/models/Registration";
import Event from "@/models/Event";

jest.mock("next-auth");
jest.mock("@/models/Registration");
jest.mock("@/models/Event");

describe("POST /api/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return 401 if not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/register", {
      method: "POST",
      body: JSON.stringify({ eventId: "event-123" }),
    });

    const response = await registerEvent(req as any);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Login required" });
  });

  test("should return 404 if event not found", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
    });

    (Event.findById as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/register", {
      method: "POST",
      body: JSON.stringify({ eventId: "invalid-event" }),
    });

    const response = await registerEvent(req as any);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Event not found" });
  });

  test("should return 400 if event is full", async () => {
    const mockEvent = {
      _id: "event-123",
      capacity: 100,
      registeredCount: 100,
    };

    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
    });

    (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

    const req = new Request("http://localhost:3000/api/register", {
      method: "POST",
      body: JSON.stringify({ eventId: "event-123" }),
    });

    const response = await registerEvent(req as any);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Event is full" });
  });

  test("should create registration with QR code", async () => {
    const mockEvent = {
      _id: "event-123",
      title: "Tech Summit",
      date: new Date("2026-04-15"),
      capacity: 100,
      registeredCount: 50,
    };

    const mockRegistration = {
      _id: "reg-123",
      userId: "user-123",
      eventId: "event-123",
      registrationId: "CP-A1B2C3D-4E5F",
      qrCode: "data:image/png;base64,...",
      checkedIn: false,
    };

    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
    });

    (Event.findById as jest.Mock).mockResolvedValue(mockEvent);
    (Registration.findOne as jest.Mock).mockResolvedValue(null);
    (Registration.create as jest.Mock).mockResolvedValue(mockRegistration);
    (Event.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockEvent);

    const req = new Request("http://localhost:3000/api/register", {
      method: "POST",
      body: JSON.stringify({ eventId: "event-123" }),
    });

    const response = await registerEvent(req as any);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.registration).toBeDefined();
    expect(data.registration.registrationId).toBe("CP-A1B2C3D-4E5F");
    expect(data.qrCode).toBeDefined();
  });

  test("should prevent duplicate registration", async () => {
    const mockEvent = {
      _id: "event-123",
      capacity: 100,
      registeredCount: 50,
    };

    const existingRegistration = {
      _id: "reg-123",
      userId: "user-123",
      eventId: "event-123",
    };

    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
    });

    (Event.findById as jest.Mock).mockResolvedValue(mockEvent);
    (Registration.findOne as jest.Mock).mockResolvedValue(existingRegistration);

    const req = new Request("http://localhost:3000/api/register", {
      method: "POST",
      body: JSON.stringify({ eventId: "event-123" }),
    });

    const response = await registerEvent(req as any);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Already registered" });
  });
});
```

#### E2E Test: User Registration Flow (Cypress)

**File**: `cypress/e2e/user-registration.cy.ts`

```typescript
describe("User Registration and Event Registration Flow", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  test("should allow user to sign up", () => {
    cy.get('a:contains("Sign Up")').click();
    cy.url().should("include", "/auth/signup");

    cy.get('input[name="name"]').type("John Doe");
    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("SecurePass123!");
    cy.get('input[name="college"]').type("MIT");

    cy.get('button:contains("Sign Up")').click();

    cy.url().should("include", "/events");
    cy.get('a:contains("John")').should("exist");
  });

  test("should allow user to view events", () => {
    cy.login("student@example.com", "student123");

    cy.visit("/events");
    cy.get('[data-testid="event-card"]').should("have.length.greaterThan", 0);
  });

  test("should allow user to register for event", () => {
    cy.login("student@example.com", "student123");

    cy.visit("/events");
    cy.get('[data-testid="event-card"]').first().click();

    cy.get('button:contains("Register")').click();
    cy.get('button:contains("View & Register")').should("not.exist");

    cy.visit("/my-events");
    cy.get('[data-testid="registered-event"]').should(
      "have.length.greaterThan",
      0,
    );
  });

  test("should display QR code after registration", () => {
    cy.login("student@example.com", "student123");

    cy.visit("/events");
    cy.get('[data-testid="event-card"]').first().click();
    cy.get('button:contains("Register")').click();

    cy.visit("/my-events");
    cy.get('[data-testid="qr-code"]').should("exist");
    cy.get('[data-testid="qr-code"]')
      .should("have.attr", "src")
      .and("include", "data:image/png");
  });

  test("should prevent duplicate registration", () => {
    cy.login("student@example.com", "student123");

    cy.visit("/events");
    cy.get('[data-testid="event-card"]').first().click();

    cy.get('button:contains("Register")').click();
    cy.get('[data-testid="success-toast"]').should("be.visible");

    cy.go("back");
    cy.get('[data-testid="event-card"]').first().click();

    cy.get('button:contains("Register")').click();
    cy.get('[data-testid="error-toast"]:contains("Already registered")').should(
      "be.visible",
    );
  });

  test("should prevent registration when event is full", () => {
    // Setup: Create event at capacity
    cy.visit("/admin/events/new");
    cy.createEvent({
      title: "Full Event",
      capacity: 1,
    });

    // First user registers
    cy.login("student1@example.com", "pass");
    cy.registerForEvent("Full Event");

    // Second user tries to register
    cy.login("student2@example.com", "pass");
    cy.visit("/events");
    cy.get('[data-testid="event-card"]:contains("Full Event")').click();

    cy.get('button:contains("Event Full")').should("be.visible");
    cy.get('button:contains("Register")').should("not.exist");
  });
});
```

#### E2E Test: Admin Check-in Flow (Cypress)

**File**: `cypress/e2e/admin-checkin.cy.ts`

```typescript
describe("Admin Check-in Flow", () => {
  beforeEach(() => {
    cy.login("admin@CampusBuzz.com", "admin123");
  });

  test("should navigate to scanner page", () => {
    cy.visit("/dashboard");
    cy.get('a:contains("Scanner")').click();
    cy.url().should("include", "/dashboard/scanner");
  });

  test("should check in user with valid QR code", () => {
    // Setup: Create registration with QR code
    cy.loginAsStudent();
    cy.registerForEvent("AI Summit");
    cy.getQRCode().then((qrCode) => {
      cy.wrap(qrCode).as("validQRCode");
    });

    // Admin check-in
    cy.login("admin@CampusBuzz.com", "admin123");
    cy.visit("/dashboard/scanner");

    cy.get("@validQRCode").then((qrCode) => {
      cy.simulateQRScan(qrCode);
    });

    cy.get('[data-testid="checkin-success"]').should("be.visible");
    cy.get('[data-testid="attendee-name"]').should("contain", "John Doe");
  });

  test("should prevent duplicate check-in", () => {
    // Already checked in
    cy.visit("/dashboard/scanner");

    cy.get("@validQRCode").then((qrCode) => {
      cy.simulateQRScan(qrCode);
    });

    cy.get('[data-testid="error-toast"]:contains("Already checked in")').should(
      "be.visible",
    );
  });

  test("should reject invalid QR code", () => {
    cy.visit("/dashboard/scanner");
    cy.simulateQRScan("invalid-data");

    cy.get('[data-testid="error-toast"]:contains("Invalid QR code")').should(
      "be.visible",
    );
  });

  test("should display dashboard statistics", () => {
    cy.visit("/dashboard");

    cy.get('[data-testid="stat-total-events"]').should("be.visible");
    cy.get('[data-testid="stat-total-students"]').should("be.visible");
    cy.get('[data-testid="stat-total-registrations"]').should("be.visible");
    cy.get('[data-testid="stat-total-checkins"]').should("be.visible");
  });
});
```

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage for utilities and models
- **Integration Tests**: 70%+ coverage for API routes
- **E2E Tests**: Happy path flows for all major user journeys
- **Total**: 75%+ coverage across application

### Running Tests

```bash
# Run all Jest unit tests
npm test

# Run specific test file
npm test -- Event.test.ts

# Run tests in watch mode
npm test -- --watch

# Run Vitest integration tests
npm run test:integration

# Run Cypress E2E tests
npm run test:e2e

# Run Cypress in UI mode
npm run test:e2e:ui
```

---

## Development Setup

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn package manager
- MongoDB (local instance or Atlas cloud)
- Git

### Installation Steps

1. **Clone Repository**

```bash
git clone https://github.com/yourrepo/CampusBuzz.git
cd CampusBuzz
```

2. **Install Dependencies**

```bash
npm install
```

3. **Setup Environment Variables**

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your settings:
# - MONGODB_URI
# - NEXTAUTH_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - NEXTAUTH_URL=http://localhost:3000
# - EMAIL_USER and EMAIL_PASS (Gmail with app password)
# - ADMIN_EMAIL
```

4. **Seed Database** (Optional - for demo data)

```bash
node scripts/seed.js
```

5. **Start Development Server**

```bash
npm run dev
```

6. **Access Application**

```
http://localhost:3000
```

### Development Workflow

**Edit Source Files**:

```
src/
├── app/                # Pages & API routes
├── components/         # React components
├── lib/               # Utilities & config
└── models/            # Database schemas
```

**Automatic Reload**:

- Next.js automatically reloads on file changes
- TypeScript compilation on save
- API routes revalidate on changes

**Testing During Development**:

```bash
# Run tests in watch mode
npm test -- --watch

# Run E2E tests in UI mode
npm run test:e2e:ui
```

---

## Deployment Guidelines

### Deployment Checklist

- [ ] Environment variables configured in production
- [ ] Database migrated to MongoDB Atlas
- [ ] Email service configured (Gmail app password or SendGrid)
- [ ] NEXTAUTH_SECRET changed to strong random value
- [ ] Build succeeds without warnings
- [ ] All tests passing
- [ ] Security headers configured
- [ ] Rate limiting implemented for APIs
- [ ] Monitoring/logging setup

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

**Output**:

```
> next build
Creating an optimized production build...
✓ Compiled successfully
✓ Linting and type checking
✓ Collecting page data
✓ Generating static pages
> next start
ready - started server on 0.0.0.0:3000
```

### Deployment Platforms

#### Vercel (Recommended for Next.js)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy (automatic on push to main)

```bash
# CLI deployment
npm i -g vercel
vercel
```

#### AWS EC2

1. Create Ubuntu 20.04 instance
2. Install Node.js and PM2
3. Clone repository
4. Configure environment variables
5. Run `npm run build && npm start`
6. Setup PM2 for process management

#### Docker Deployment

**Dockerfile**:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Build & Run**:

```bash
docker build -t CampusBuzz .
docker run -p 3000:3000 --env-file .env.local CampusBuzz
```

### Database Migration to Production

**MongoDB Atlas Setup**:

1. Create free cluster on MongoDB Atlas
2. Create database user
3. Whitelist IP address
4. Get connection string
5. Update `MONGODB_URI` in production .env

**Connection String Format**:

```
mongodb+srv://username:password@cluster.mongodb.net/CampusBuzz
```

---

## Environment Variables Reference

### Required Variables

```env
# Database Connection
MONGODB_URI=mongodb://127.0.0.1:27017/CampusBuzz
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/CampusBuzz

# NextAuth Configuration
NEXTAUTH_SECRET=your-super-secret-key-here-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# Email Service (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=app-specific-password

# Admin Configuration
ADMIN_EMAIL=admin@CampusBuzz.com
```

### Variable Descriptions

| Variable          | Type   | Example                  | Notes                                  |
| ----------------- | ------ | ------------------------ | -------------------------------------- |
| `MONGODB_URI`     | URL    | `mongodb+srv://...`      | Database connection string             |
| `NEXTAUTH_SECRET` | String | 32+ random chars         | JWT signing secret                     |
| `NEXTAUTH_URL`    | URL    | `http://localhost:3000`  | App URL for callbacks                  |
| `EMAIL_USER`      | Email  | `noreply@gmail.com`      | Gmail address for sending              |
| `EMAIL_PASS`      | String | App-specific password    | Gmail app password (not main password) |
| `ADMIN_EMAIL`     | Email  | `admin@CampusBuzz.com` | Auto-assign admin on signup            |

### Generating NEXTAUTH_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. MongoDB Connection Error

**Error**: `MongooseError: Cannot connect to MongoDB`

**Causes**:

- MongoDB not running locally
- Invalid connection string
- Network/firewall blocking connection

**Solutions**:

```bash
# Check if MongoDB is running (Windows)
net start MongoDB

# Or start MongoDB manually
mongod --dbpath="C:\data\db"

# Test connection
mongo mongodb://127.0.0.1:27017/CampusBuzz
```

---

#### 2. NextAuth Secret Not Set

**Error**: `Error: NEXTAUTH_SECRET is not set`

**Solution**:

```bash
# Generate and add to .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to NEXTAUTH_SECRET=...
```

---

#### 3. Email Not Sending

**Error**: No confirmation emails received

**Causes**:

- Gmail app password incorrect
- 2FA not enabled on Gmail
- Email credentials wrong format

**Solutions**:

1. Create new app password in Gmail security settings
2. Use app password, not main password
3. Enable 2-Factor Authentication first

```env
# Verify format
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=16-char-app-password
```

---

#### 4. QR Code Not Displaying

**Error**: QR code shows as broken image in email

**Causes**:

- QR generation failed
- Base64 data URL too large for email
- Email client doesn't support data URLs

**Solutions**:

```typescript
// Verify QR generation
const qrCode = await QRCode.toDataURL(data, { width: 300 });
console.log(qrCode.length); // Should be ~5000-10000 chars

// Alternative: Host QR code as image URL instead of data URL
```

---

#### 5. Duplicate Registration Not Prevented

**Error**: User can register twice for same event

**Cause**: Compound index not created

**Solution**:

```bash
# Manually ensure index exists
mongo
> db.registrations.createIndex({ userId: 1, eventId: 1 }, { unique: true })

# Or regenerate from code
```

---

#### 6. TypeScript Errors in Production

**Error**: `Property '...' does not exist on type 'Session'`

**Cause**: Type definitions missing for NextAuth extensions

**Solution**:

```typescript
// Add type definition in types/next-auth.d.ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "student" | "admin";
      email: string;
      name: string;
    };
  }
}
```

---

#### 7. CORS Errors in API Calls

**Error**: `Cross-Origin Request Blocked`

**Cause**: API endpoint called from different domain

**Note**: Next.js API routes don't have CORS issues from same domain

**Solution**:

- Ensure API calls use relative paths: `/api/events`
- Don't use absolute URLs from frontend code

---

### Performance Optimization

#### 1. Database Connection Pooling

Already implemented in `src/lib/mongodb.ts`:

```typescript
// Caches and reuses connection across requests
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}
```

#### 2. Query Optimization

```typescript
// Use .lean() for read-only queries
const events = await Event.find(query).lean();

// Use indexes on frequently queried fields
RegistrationSchema.index({ userId: 1, eventId: 1 });
```

#### 3. Image Optimization

- Use Next.js Image component (configured in next.config.mjs)
- Specify remote patterns for optimization
- Automatic WebP conversion

#### 4. CSS Optimization

- Tailwind CSS purges unused styles in production
- PostCSS minifies CSS
- Turbopack improves build time (experimental)

---

## Future Enhancements

### Planned Features (Roadmap)

1. **User Features**
   - Event calendar view
   - Event favorites/wishlist
   - User profile customization
   - Event recommendations
   - Social sharing (QR code, event link)

2. **Admin Features**
   - Advanced analytics (charts, graphs)
   - Event templates
   - Bulk email to registrants
   - Attendance reports
   - Export registrations (CSV, PDF)

3. **Technical Improvements**
   - Add Stripe/PayPal for paid events
   - Real-time notifications (WebSockets)
   - Mobile app (React Native)
   - Calendar integration (Google Calendar, Outlook)
   - Rate limiting on APIs
   - Request/response caching

4. **Security Enhancements**
   - Two-factor authentication (2FA)
   - OAuth providers (Google, GitHub login)
   - API key authentication
   - Audit logging
   - Data encryption for sensitive fields

5. **Scalability**
   - Redis caching layer
   - GraphQL API
   - Microservices architecture
   - CDN for static assets
   - Database sharding

---

## Contributing Guidelines

### Code Standards

- **Language**: TypeScript (strict mode)
- **Formatting**: Prettier (auto-format)
- **Linting**: ESLint with Next.js config
- **Testing**: Jest + Cypress for critical paths

### Commit Message Format

```
[TYPE]: Brief description

Detailed explanation (optional)

Fixes #issue-number (if applicable)
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:

```
feat: Add event filtering by category

Implemented category filter on /events page with
dynamic query parameters.

Fixes #45
```

### Pull Request Process

1. Create feature branch: `git checkout -b feat/feature-name`
2. Make changes and commit with conventional messages
3. Push to GitHub: `git push origin feat/feature-name`
4. Create Pull Request with description
5. Pass all tests and reviews
6. Merge to main

---

## Documentation Index

| Document                 | Purpose                          |
| ------------------------ | -------------------------------- |
| README.md                | Project overview and quick start |
| PROJECT_DOCUMENTATION.md | This comprehensive guide         |
| .env.example             | Environment variables template   |
| src/models/\*.ts         | Database schema definitions      |
| src/lib/auth.ts          | Authentication configuration     |
| src/lib/email.ts         | Email service setup              |

---

## Support & Resources

### Getting Help

- **Documentation**: This file
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: Contact team at support@CampusBuzz.com

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Mongoose Documentation](https://mongoosejs.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

## Project Metadata

- **Name**: CampusBuzz (CampusBuzz)
- **Version**: 0.1.0
- **Status**: MVP Complete
- **Last Updated**: March 2026
- **Repository**: [GitHub Link]
- **Live Demo**: [Demo Link]

---

**Document Generated**: March 28, 2026  
**For**: CampusBuzz Development Team  
**Maintained By**: Engineering Team  
**Next Review**: Q2 2026
