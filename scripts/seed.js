// CampusBuzz Seed Script — with tier-distributed students for algorithm demo
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Load environment variables from .env
const fs = require("fs");
const envPath = ".env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env");
  process.exit(1);
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  college: String,
  engagementTier: { type: String, enum: ['champion', 'regular', 'new', 'unreliable'], default: 'new' },
  reliabilityScore: { type: Number, default: null },
  scoreHistory: [{
    score: Number,
    tier: String,
    reason: String,
    changedAt: { type: Date, default: Date.now },
  }],
  isBanned: { type: Boolean, default: false },
  banReason: String,
  bannedAt: Date,
}, { timestamps: true });

const EventSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  date: Date,
  endDate: Date,
  venue: String,
  capacity: Number,
  registeredCount: { type: Number, default: 0 },
  imageUrl: String,
  organizer: String,
  tags: [String],
  isActive: { type: Boolean, default: true },
  feeType: { type: String, default: "free" },
  feeAmount: { type: Number, default: 0 },
  registrationDeadline: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isCancelled: { type: Boolean, default: false },
  cancelledAt: Date,
  cancelReason: String,
}, { timestamps: true });

const RegistrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  registrationId: String,
  qrCode: String,
  checkedIn: { type: Boolean, default: false },
  checkedInAt: Date,
  anomalyScore: Number,
  flagged: { type: Boolean, default: false },
  adminOverride: { type: Boolean, default: false },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  confirmed: { type: Boolean, default: false },
  promotedFromWaitlist: { type: Boolean, default: false },
  isLastMinute: { type: Boolean, default: false },
  confirmationEmailSent: { type: Boolean, default: false },
  confirmTokenExpiry: Date,
  cancelledAt: Date,
  confirmationEmailSentAt: Date,
  confirmedAt: Date,
  adminDenyNote: String,
  flagReason: String,
  reviewedAt: Date,
}, { timestamps: true });

const WaitlistSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  priorityScore: Number,
  joinedAt: Date,
}, { timestamps: true });

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "Registration" },
  amount: Number,
  provider: String,
  transactionId: String,
  status: { type: String, default: "pending" },
  purchaseOrderId: String,
  purchaseOrderName: String,
  metadata: mongoose.Schema.Types.Mixed,
  refundedAt: Date,
  refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);
const Waitlist = mongoose.models.Waitlist || mongoose.model("Waitlist", WaitlistSchema);
const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysFromNow(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function generateRegId() {
  return "CP-" + crypto.randomBytes(8).toString("hex").toUpperCase();
}

function generateOrderId() {
  return "ORD-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

function generateTxnId() {
  return "TXN-" + crypto.randomBytes(8).toString("hex").toUpperCase();
}

// Minimal 1x1 transparent PNG as placeholder QR
const PLACEHOLDER_QR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    // Drop all collections for a clean state
    await User.deleteMany({});
    await Event.deleteMany({});
    await Registration.deleteMany({});
    await Waitlist.deleteMany({});
    await Payment.deleteMany({});
    console.log("Cleared existing data");

    // ── Admin users ──────────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash("Admin@123", 12);
    const [admin1] = await User.insertMany([
      {
        name: "Campus Admin",
        email: "admin@campusbuzz.com",
        password: adminPassword,
        role: "admin",
        college: "CampusBuzz University",
      },
      {
        name: "Event Coordinator",
        email: "coordinator@campusbuzz.com",
        password: adminPassword,
        role: "admin",
        college: "CampusBuzz University",
      },
    ]);
    console.log("Created 2 admin users");

    // ── Student users with deliberate tier distribution ──────────────────────
    // student0 (demo)  → champion tier (high attendance)
    // student1-3       → champion tier (high attendance)
    // student4-8       → regular tier (medium attendance)
    // student9-11      → new tier (few registrations)
    // student12-14     → unreliable tier (low attendance / bulk registrations)
    const studentPassword = await bcrypt.hash("Student@123", 12);
    const studentDefs = [
      // Demo student — champion
      { name: "Demo Student",  email: "student@campusbuzz.com",   tier: "champion",   score: 88 },
      // Champions (student1-3)
      { name: "Student 1",     email: "student1@campusbuzz.com",  tier: "champion",   score: 92 },
      { name: "Student 2",     email: "student2@campusbuzz.com",  tier: "champion",   score: 85 },
      { name: "Student 3",     email: "student3@campusbuzz.com",  tier: "champion",   score: 80 },
      // Regulars (student4-8)
      { name: "Student 4",     email: "student4@campusbuzz.com",  tier: "regular",    score: 65 },
      { name: "Student 5",     email: "student5@campusbuzz.com",  tier: "regular",    score: 60 },
      { name: "Student 6",     email: "student6@campusbuzz.com",  tier: "regular",    score: 58 },
      { name: "Student 7",     email: "student7@campusbuzz.com",  tier: "regular",    score: 55 },
      { name: "Student 8",     email: "student8@campusbuzz.com",  tier: "regular",    score: 52 },
      // New (student9-11)
      { name: "Student 9",     email: "student9@campusbuzz.com",  tier: "new",        score: null },
      { name: "Student 10",    email: "student10@campusbuzz.com", tier: "new",        score: null },
      { name: "Student 11",    email: "student11@campusbuzz.com", tier: "new",        score: null },
      // Unreliable (student12-14)
      { name: "Student 12",    email: "student12@campusbuzz.com", tier: "unreliable", score: 18 },
      { name: "Student 13",    email: "student13@campusbuzz.com", tier: "unreliable", score: 12 },
      { name: "Student 14",    email: "student14@campusbuzz.com", tier: "unreliable", score: 15 },
    ];

    const students = await User.insertMany(
      studentDefs.map((s, idx) => ({
        name: s.name,
        email: s.email,
        password: studentPassword,
        role: "student",
        college: "CampusBuzz University",
        engagementTier: s.tier,
        reliabilityScore: s.score,
        scoreHistory: s.score ? [
          { score: Math.max(0, s.score - 10), tier: s.tier === 'champion' ? 'regular' : s.tier, reason: 'Initial assessment', changedAt: new Date(Date.now() - 60 * 24 * 3600000) },
          { score: s.score, tier: s.tier, reason: s.tier === 'champion' ? 'Consistent high attendance' : 'Recalculated after recent events', changedAt: new Date(Date.now() - 7 * 24 * 3600000) },
        ] : [],
        isBanned: idx === 14,
        banReason: idx === 14 ? 'Repeated no-show for registered events' : undefined,
        bannedAt: idx === 14 ? new Date(Date.now() - 2 * 24 * 3600000) : undefined,
      }))
    );
    console.log(`Created ${students.length} student users (4 champion, 5 regular, 3 new, 3 unreliable; 1 banned)`);

    // ── Events (Req 15.2: 15+ across all 7 categories, free/paid, past/upcoming) ──
    const eventDefs = [
      // ── Technical (3) ──
      {
        title: "Hackathon 2026 — Build for Tomorrow",
        description: "36-hour hackathon with teams of 3-5 building innovative solutions. Prizes worth ₹1,00,000!",
        category: "Technical",
        date: daysFromNow(14, 9), endDate: daysFromNow(15, 21),
        venue: "Innovation Hub, New Building",
        capacity: 50, registeredCount: 50,
        feeType: "free",
        organizer: "Tech Club", tags: ["hackathon", "coding", "prizes"],
      },
      {
        title: "AI & Machine Learning Summit 2026",
        description: "Industry experts sharing cutting-edge research in AI and ML.",
        category: "Technical",
        date: daysFromNow(21, 10), endDate: daysFromNow(21, 17),
        venue: "Main Auditorium, Block A",
        capacity: 100, registeredCount: 100,
        feeType: "paid", feeAmount: 500,
        organizer: "CS Department", tags: ["ai", "ml", "tech"],
      },
      {
        title: "Past Tech Talk 2025",
        description: "Recap of the latest trends in cloud computing.",
        category: "Technical",
        date: daysFromNow(-30, 10), endDate: daysFromNow(-30, 12),
        venue: "Conference Room B",
        capacity: 100, registeredCount: 65,
        feeType: "free",
        organizer: "Tech Club", tags: ["cloud", "talk"],
      },
      // ── Cultural (2) ──
      {
        title: "Annual Cultural Fest — VIBRANCE 2026",
        description: "The biggest cultural event! Dance, music, drama from 20+ states.",
        category: "Cultural",
        date: daysFromNow(10, 11), endDate: daysFromNow(10, 23),
        venue: "College Ground",
        capacity: 400, registeredCount: 360,
        feeType: "paid", feeAmount: 200,
        organizer: "Cultural Committee", tags: ["cultural", "dance", "music"],
      },
      {
        title: "Classical Music Evening",
        description: "An evening of Hindustani classical music by renowned artists.",
        category: "Cultural",
        date: daysFromNow(30, 18), endDate: daysFromNow(30, 21),
        venue: "Open Air Theatre",
        capacity: 200, registeredCount: 80,
        feeType: "paid", feeAmount: 150,
        organizer: "Music Society", tags: ["music", "classical", "culture"],
      },
      // ── Sports (2) ──
      {
        title: "Inter-College Basketball Tournament",
        description: "16 teams from across the region competing in thrilling matches.",
        category: "Sports",
        date: daysFromNow(18, 8), endDate: daysFromNow(19, 18),
        venue: "Sports Complex",
        capacity: 300, registeredCount: 80,
        feeType: "free",
        organizer: "Sports Committee", tags: ["basketball", "sports", "tournament"],
      },
      {
        title: "Annual Athletics Meet 2026",
        description: "Track and field events open to all students. Represent your department!",
        category: "Sports",
        date: daysFromNow(35, 7), endDate: daysFromNow(35, 17),
        venue: "Athletics Ground",
        capacity: 500, registeredCount: 120,
        feeType: "free",
        organizer: "Sports Committee", tags: ["athletics", "track", "field"],
      },
      // ── Workshop (3) ──
      {
        title: "Web Development Bootcamp",
        description: "Hands-on 2-day bootcamp covering modern web dev. Learn React and Next.js.",
        category: "Workshop",
        date: daysFromNow(7, 9), endDate: daysFromNow(8, 17),
        venue: "Computer Lab 301",
        capacity: 50, registeredCount: 42,
        feeType: "paid", feeAmount: 300,
        organizer: "Web Dev Club", tags: ["web", "react", "nextjs"],
      },
      {
        title: "IoT Fundamentals Workshop",
        description: "Learn Internet of Things from scratch. Perfect for beginners!",
        category: "Workshop",
        date: daysFromNow(25, 10), endDate: daysFromNow(25, 16),
        venue: "Electronics Lab",
        capacity: 40, registeredCount: 0,
        feeType: "free",
        organizer: "Electronics Club", tags: ["iot", "hardware", "beginners"],
      },
      {
        title: "Photography Masterclass",
        description: "Learn composition, lighting, and post-processing from a professional photographer.",
        category: "Workshop",
        date: daysFromNow(12, 10), endDate: daysFromNow(12, 16),
        venue: "Media Lab",
        capacity: 30, registeredCount: 15,
        feeType: "paid", feeAmount: 250,
        organizer: "Photography Club", tags: ["photography", "art", "creative"],
      },
      // ── Seminar (2) ──
      {
        title: "Career Development Seminar",
        description: "Industry leaders on career planning, resume building, and interview prep.",
        category: "Seminar",
        date: daysFromNow(5, 14), endDate: daysFromNow(5, 17),
        venue: "Seminar Hall 2",
        capacity: 150, registeredCount: 45,
        feeType: "free",
        organizer: "Placement Cell", tags: ["career", "placement", "jobs"],
      },
      {
        title: "Entrepreneurship & Startup Seminar",
        description: "Founders share their journey from idea to product-market fit.",
        category: "Seminar",
        date: daysFromNow(40, 10), endDate: daysFromNow(40, 13),
        venue: "Auditorium B",
        capacity: 200, registeredCount: 60,
        feeType: "free",
        organizer: "E-Cell", tags: ["startup", "entrepreneurship", "business"],
      },
      // ── Hackathon (2) ──
      {
        title: "Smart City Hackathon",
        description: "Build solutions for urban challenges. 24-hour sprint with mentors.",
        category: "Hackathon",
        date: daysFromNow(45, 9), endDate: daysFromNow(46, 9),
        venue: "Innovation Lab",
        capacity: 80, registeredCount: 40,
        feeType: "free",
        organizer: "CSE Department", tags: ["hackathon", "smart-city", "innovation"],
      },
      {
        title: "FinTech Hackathon 2026",
        description: "Solve real-world financial problems with technology. Cash prizes!",
        category: "Hackathon",
        date: daysFromNow(60, 9), endDate: daysFromNow(61, 18),
        venue: "Business School Atrium",
        capacity: 60, registeredCount: 20,
        feeType: "paid", feeAmount: 100,
        organizer: "Finance Club", tags: ["fintech", "hackathon", "finance"],
      },
      // ── Other (2) ──
      {
        title: "Campus Cleanup Drive",
        description: "Join us to make our campus greener and cleaner. Refreshments provided.",
        category: "Other",
        date: daysFromNow(3, 7), endDate: daysFromNow(3, 11),
        venue: "Campus Grounds",
        capacity: 200, registeredCount: 55,
        feeType: "free",
        organizer: "NSS Unit", tags: ["environment", "volunteer", "community"],
      },
      {
        title: "Alumni Networking Night",
        description: "Connect with alumni from top companies. Formal networking event.",
        category: "Other",
        date: daysFromNow(20, 18), endDate: daysFromNow(20, 21),
        venue: "Conference Hall",
        capacity: 120, registeredCount: 90,
        feeType: "paid", feeAmount: 50,
        organizer: "Alumni Association", tags: ["networking", "alumni", "career"],
      },
    ].map(e => ({ ...e, imageUrl: "", isActive: true, isCancelled: false, createdBy: admin1._id }));

    const createdEvents = await Event.insertMany(eventDefs);
    console.log(`Created ${createdEvents.length} events`);

    // ── Registrations with tier-appropriate attendance patterns ─────────────
    // Champions (idx 0-3): register for many events, check in to most (≥70%)
    // Regulars  (idx 4-8): register for several events, check in to ~50-65%
    // New       (idx 9-11): only 1-2 registrations, no check-ins yet
    // Unreliable(idx 12-14): register for many events, almost never check in (<25%)
    const now = new Date();
    const freeUpcomingEvents = createdEvents.filter(e =>
      e.feeType === "free" && e.date > now
    );
    const paidUpcomingEvents = createdEvents.filter(e =>
      e.feeType === "paid" && e.date > now
    );
    const pastEvents = createdEvents.filter(e => e.date <= now);

    const registrations = [];
    let totalCheckedIn = 0;
    let anomalyCount = 0;

    // Helper: create a registration record
    function makeReg(userId, eventId, opts = {}) {
      const {
        checkedIn = false,
        confirmed = true,
        flagged = false,
        anomalyScore = null,
        checkedInAt = null,
        cancelledAt = null,
        flagReason = null,
        reviewedAt = null,
      } = opts;
      const confirmedAt = confirmed ? new Date(Date.now() - 3600000) : null;
      return {
        userId,
        eventId,
        registrationId: generateRegId(),
        qrCode: confirmed ? PLACEHOLDER_QR : "",
        checkedIn,
        checkedInAt: checkedIn && !checkedInAt
          ? new Date(Date.now() - Math.random() * 3600000)
          : checkedInAt,
        anomalyScore,
        flagged,
        adminOverride: false,
        confirmed,
        confirmedAt,
        promotedFromWaitlist: false,
        isLastMinute: false,
        confirmationEmailSent: confirmed,
        confirmationEmailSentAt: confirmed ? new Date(Date.now() - 3300000) : null,
        cancelledAt,
        flagReason,
        reviewedAt,
      };
    }

    // ── Champions (idx 0-3): high attendance ──────────────────────────────
    for (let i = 0; i <= 3; i++) {
      const s = students[i];
      // Register for 6 free upcoming events, check in to 5 (83%)
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 6);
      evts.forEach((evt, j) => {
        const ci = j < 5; // check in to first 5
        if (ci) totalCheckedIn++;
        registrations.push(makeReg(s._id, evt._id, { checkedIn: ci }));
      });
      // Also register for 1 past event (checked in)
      if (pastEvents.length > 0) {
        totalCheckedIn++;
        registrations.push(makeReg(s._id, pastEvents[0]._id, { checkedIn: true }));
      }
    }

    // ── Regulars (idx 4-8): medium attendance ─────────────────────────────
    for (let i = 4; i <= 8; i++) {
      const s = students[i];
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 5);
      evts.forEach((evt, j) => {
        const ci = j < 3; // check in to 3 of 5 (60%)
        if (ci) totalCheckedIn++;
        registrations.push(makeReg(s._id, evt._id, { checkedIn: ci }));
      });
    }

    // ── New (idx 9-11): very few registrations, no check-ins ──────────────
    for (let i = 9; i <= 11; i++) {
      const s = students[i];
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 2);
      evts.forEach(evt => {
        registrations.push(makeReg(s._id, evt._id, { checkedIn: false, confirmed: false, confirmationEmailSent: false }));
      });
    }

    // ── Unreliable (idx 12-14): many registrations, almost never check in ──
    for (let i = 12; i <= 14; i++) {
      const s = students[i];
      // Register for 8 events but only check in to 1 (12.5% attendance)
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, Math.min(8, freeUpcomingEvents.length));
      evts.forEach((evt, j) => {
        const ci = j === 0; // only check in to first one
        if (ci) totalCheckedIn++;
        registrations.push(makeReg(s._id, evt._id, { checkedIn: ci }));
      });
    }

    // ── 3 anomalous check-ins for IF demo ─────────────────────────────────
    // Use unreliable students' registrations and mark some as anomalous
    const anomalousStudents = [students[12], students[13], students[14]];
    for (const s of anomalousStudents) {
      if (freeUpcomingEvents.length > anomalyCount) {
        const evt = freeUpcomingEvents[anomalyCount];
        const alreadyExists = registrations.find(
          r => r.userId.toString() === s._id.toString() && r.eventId.toString() === evt._id.toString()
        );
        if (!alreadyExists) {
          const anomAt = new Date(evt.date);
          anomAt.setHours(3, Math.floor(Math.random() * 60));
          registrations.push(makeReg(s._id, evt._id, {
            checkedIn: true,
            checkedInAt: anomAt,
            anomalyScore: 0.75 + Math.random() * 0.2,
            flagged: true,
            flagReason: 'Suspicious check-in time (early morning)',
            reviewedAt: null,
          }));
          totalCheckedIn++;
          anomalyCount++;
        }
      }
    }

    const createdRegistrations = await Registration.insertMany(registrations);
    console.log(`Created ${createdRegistrations.length} registrations (${totalCheckedIn} checked in, ${anomalyCount} anomalous)`);

    // ── Waitlist entries ─────────────────────────────────────────────────────
    // Put unreliable + new students on waitlists for full events
    const fullFreeEvents = createdEvents.filter(e =>
      e.feeType === "free" && e.registeredCount >= e.capacity && e.date > now
    );
    const waitlistEntries = [];

    // student12, student13 on waitlist for first full free event
    if (fullFreeEvents.length > 0) {
      [students[12], students[13]].forEach((s, i) => {
        waitlistEntries.push({
          eventId: fullFreeEvents[0]._id,
          userId: s._id,
          priorityScore: Date.now() - i * 3_600_000,
          joinedAt: new Date(Date.now() - i * 3_600_000),
          abandonedAt: null,
        });
      });
    }
    // student14, student9 on waitlist for second full free event (if exists)
    if (fullFreeEvents.length > 1) {
      [students[14], students[9]].forEach((s, i) => {
        waitlistEntries.push({
          eventId: fullFreeEvents[1]._id,
          userId: s._id,
          priorityScore: Date.now() - i * 3_600_000,
          joinedAt: new Date(Date.now() - i * 3_600_000),
          abandonedAt: null,
        });
      });
    }

    if (waitlistEntries.length > 0) {
      await Waitlist.insertMany(waitlistEntries);
    }
    console.log(`Created ${waitlistEntries.length} waitlist entries`);

    // ── Payment records (Req 15.5) ───────────────────────────────────────────
    // For each paid upcoming event, create payments for some students
    const payments = [];
    const paymentStatuses = ["completed", "completed", "completed", "pending", "refunded"];

    for (const evt of paidUpcomingEvents) {
      // Pick 3-5 students to have payments for this event
      const numPayers = Math.min(Math.floor(Math.random() * 3) + 3, students.length);
      const payers = [...students].sort(() => Math.random() - 0.5).slice(0, numPayers);

      for (let i = 0; i < payers.length; i++) {
        const student = payers[i];
        const status = paymentStatuses[i % paymentStatuses.length];
        const provider = i % 2 === 0 ? "esewa" : "khalti";
        const orderId = generateOrderId();
        const txnId = status !== "pending" ? generateTxnId() : undefined;

        payments.push({
          userId: student._id,
          eventId: evt._id,
          amount: evt.feeAmount,
          provider,
          transactionId: txnId,
          status,
          purchaseOrderId: orderId,
          purchaseOrderName: evt.title,
          metadata: { provider, eventTitle: evt.title },
          refundedAt: status === "refunded" ? new Date() : undefined,
          refundedBy: status === "refunded" ? admin1._id : undefined,
        });
      }
    }

    const createdPayments = await Payment.insertMany(payments);
    console.log(`Created ${createdPayments.length} payment records`);

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log("\n=== Seed Complete ===");
    console.log(`  Admin users:    2`);
    console.log(`  Student users:  ${students.length}`);
    console.log(`    Champion:     4 (demo, student1-3)`);
    console.log(`    Regular:      5 (student4-8)`);
    console.log(`    New:          3 (student9-11)`);
    console.log(`    Unreliable:   3 (student12-14)`);
    console.log(`  Events:         ${createdEvents.length} (across all 7 categories)`);
    console.log(`  Registrations:  ${createdRegistrations.length} (${totalCheckedIn} checked in, ${anomalyCount} anomalous)`);
    console.log(`  Waitlist:       ${waitlistEntries.length} entries`);
    console.log(`  Payments:       ${createdPayments.length} (mix of completed/pending/refunded)`);
    console.log("\nLogin credentials:");
    console.log("  admin@campusbuzz.com        / Admin@123");
    console.log("  coordinator@campusbuzz.com  / Admin@123");
    console.log("  student@campusbuzz.com      / Student@123  (Champion)");
    console.log("  student1@campusbuzz.com     / Student@123  (Champion)");
    console.log("  student9@campusbuzz.com     / Student@123  (New)");
    console.log("  student12@campusbuzz.com    / Student@123  (Unreliable)");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
