const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

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
  joinedAt: Date,
  abandonedAt: { type: Date, default: null },
  wasPromoted: { type: Boolean, default: false },
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

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
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

const PLACEHOLDER_QR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

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

    // ── Student users with deliberate tier distribution (25 total) ──────────
    // Indices:
    //   0 (demo) + 1-6   → champion (8+ attended, 70%+ rate, 60%+ recent)
    //   7-14              → regular  (3-7 attended, 40-69% rate)
    //   15-18             → new      (1-2 registrations, no check-ins)
    //   19-23             → unreliable (multiple failure conditions)
    //   24                → banned student
    const studentPassword = await bcrypt.hash("Student@123", 12);
    const studentDefs = [
      // Champions (7): high attendance, good recent history
      { name: "Demo Student",     email: "student@campusbuzz.com",     tier: "champion",   score: 88 },
      { name: "Aadarsh Thapa",   email: "student1@campusbuzz.com",    tier: "champion",   score: 92 },
      { name: "Bibek K.C.",      email: "student2@campusbuzz.com",    tier: "champion",   score: 85 },
      { name: "Sita Sharma",     email: "student3@campusbuzz.com",    tier: "champion",   score: 80 },
      { name: "Ram Poudel",      email: "student4@campusbuzz.com",    tier: "champion",   score: 82 },
      { name: "Gita Adhikari",   email: "student5@campusbuzz.com",    tier: "champion",   score: 78 },
      { name: "Hari Gurung",     email: "student6@campusbuzz.com",    tier: "champion",   score: 75 },
      // Regulars (8): medium attendance
      { name: "Maya Tamang",     email: "student7@campusbuzz.com",    tier: "regular",    score: 65 },
      { name: "Krishna Bhandari", email: "student8@campusbuzz.com",   tier: "regular",    score: 60 },
      { name: "Radha Neupane",   email: "student9@campusbuzz.com",    tier: "regular",    score: 58 },
      { name: "Shiva Karki",     email: "student10@campusbuzz.com",   tier: "regular",    score: 55 },
      { name: "Laxmi Khatri",    email: "student11@campusbuzz.com",   tier: "regular",    score: 52 },
      { name: "Sagar Sharma",    email: "student12@campusbuzz.com",   tier: "regular",    score: 48 },
      { name: "Pooja Paudel",    email: "student13@campusbuzz.com",   tier: "regular",    score: 45 },
      { name: "Saurabh Basnet",  email: "student14@campusbuzz.com",   tier: "regular",    score: 50 },
      // New (4): few registrations, no check-ins
      { name: "Riya Shrestha",   email: "student15@campusbuzz.com",   tier: "new",        score: null },
      { name: "Aditya Bhattarai", email: "student16@campusbuzz.com",  tier: "new",        score: null },
      { name: "Kavita Neupane",  email: "student17@campusbuzz.com",   tier: "new",        score: null },
      { name: "Nitin Rai",       email: "student18@campusbuzz.com",   tier: "new",        score: null },
      // Unreliable (5): diverse failure conditions
      { name: "Gaurav Ghimire",  email: "student19@campusbuzz.com",   tier: "unreliable", score: 18 },
      { name: "Meera Subedi",    email: "student20@campusbuzz.com",   tier: "unreliable", score: 12 },
      { name: "Sunil Acharya",   email: "student21@campusbuzz.com",   tier: "unreliable", score: 15 },
      { name: "Tanvi Koirala",   email: "student22@campusbuzz.com",   tier: "unreliable", score: 10 },
      { name: "Akash Thapa",     email: "student23@campusbuzz.com",   tier: "unreliable", score: 8 },
      // Banned (1)
      { name: "Banned User",     email: "student24@campusbuzz.com",   tier: "unreliable", score: 5 },
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
        isBanned: idx === 24,
        banReason: idx === 24 ? 'Repeated no-show for registered events' : undefined,
        bannedAt: idx === 24 ? new Date(Date.now() - 2 * 24 * 3600000) : undefined,
      }))
    );
    console.log(`Created ${students.length} student users (7 champion, 8 regular, 4 new, 5 unreliable, 1 banned)`);

    // ── Events ───────────────────────────────────────────────────────────────

    // Now reference for date building:
    // The "3 days from now" event comes first so it appears in the auto-trigger window.
    const eventDefs = [
      // ── Event exactly 3 days away (auto-confirmation demo) ────────────
      {
        title: "Quick Workshop: Resume Building",
        description: "A fast-paced workshop on building your resume. Auto-confirmation demo event — 3 days away.",
        category: "Workshop",
        date: hoursFromNow(78), endDate: hoursFromNow(80),
        venue: "Career Center, Ground Floor",
        capacity: 60, registeredCount: 0,
        feeType: "free",
        organizer: "Placement Cell", tags: ["resume", "career", "workshop"],
      },
      // ── Technical (3) ──
      {
        title: "Hackathon 2026 — Build for Tomorrow",
        description: "36-hour hackathon with teams of 3-5 building innovative solutions. Prizes worth ₹1,00,000!",
        category: "Technical",
        date: daysFromNow(14, 9), endDate: daysFromNow(15, 21),
        venue: "Innovation Hub, New Building",
        capacity: 50, registeredCount: 0,
        feeType: "free",
        organizer: "Tech Club", tags: ["hackathon", "coding", "prizes"],
      },
      {
        title: "AI & Machine Learning Summit 2026",
        description: "Industry experts sharing cutting-edge research in AI and ML.",
        category: "Technical",
        date: daysFromNow(21, 10), endDate: daysFromNow(21, 17),
        venue: "Main Auditorium, Block A",
        capacity: 100, registeredCount: 0,
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
        capacity: 400, registeredCount: 0,
        feeType: "paid", feeAmount: 200,
        organizer: "Cultural Committee", tags: ["cultural", "dance", "music"],
      },
      {
        title: "Classical Music Evening",
        description: "An evening of Hindustani classical music by renowned artists.",
        category: "Cultural",
        date: daysFromNow(30, 18), endDate: daysFromNow(30, 21),
        venue: "Open Air Theatre",
        capacity: 200, registeredCount: 0,
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
        capacity: 300, registeredCount: 0,
        feeType: "free",
        organizer: "Sports Committee", tags: ["basketball", "sports", "tournament"],
      },
      {
        title: "Annual Athletics Meet 2026",
        description: "Track and field events open to all students. Represent your department!",
        category: "Sports",
        date: daysFromNow(35, 7), endDate: daysFromNow(35, 17),
        venue: "Athletics Ground",
        capacity: 500, registeredCount: 0,
        feeType: "free",
        organizer: "Sports Committee", tags: ["athletics", "track", "field"],
      },
      // ── Workshop (2 + 1 above for auto-confirm) ──
      {
        title: "Web Development Bootcamp",
        description: "Hands-on 2-day bootcamp covering modern web dev. Learn React and Next.js.",
        category: "Workshop",
        date: daysFromNow(7, 9), endDate: daysFromNow(8, 17),
        venue: "Computer Lab 301",
        capacity: 50, registeredCount: 0,
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
      // ── Seminar (2) ──
      {
        title: "Career Development Seminar",
        description: "Industry leaders on career planning, resume building, and interview prep.",
        category: "Seminar",
        date: daysFromNow(5, 14), endDate: daysFromNow(5, 17),
        venue: "Seminar Hall 2",
        capacity: 150, registeredCount: 0,
        feeType: "free",
        organizer: "Placement Cell", tags: ["career", "placement", "jobs"],
      },
      {
        title: "Entrepreneurship & Startup Seminar",
        description: "Founders share their journey from idea to product-market fit.",
        category: "Seminar",
        date: daysFromNow(40, 10), endDate: daysFromNow(40, 13),
        venue: "Auditorium B",
        capacity: 200, registeredCount: 0,
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
        capacity: 80, registeredCount: 0,
        feeType: "free",
        organizer: "CSE Department", tags: ["hackathon", "smart-city", "innovation"],
      },
      {
        title: "FinTech Hackathon 2026",
        description: "Solve real-world financial problems with technology. Cash prizes!",
        category: "Hackathon",
        date: daysFromNow(60, 9), endDate: daysFromNow(61, 18),
        venue: "Business School Atrium",
        capacity: 60, registeredCount: 0,
        feeType: "paid", feeAmount: 100,
        organizer: "Finance Club", tags: ["fintech", "hackathon", "finance"],
      },
      // ── Other (3: 1 upcoming full, 1 normal, 1 CANCELLED) ──
      {
        title: "Campus Cleanup Drive",
        description: "Join us to make our campus greener and cleaner. Refreshments provided.",
        category: "Other",
        date: daysFromNow(3, 7), endDate: daysFromNow(3, 11),
        venue: "Campus Grounds",
        capacity: 5, registeredCount: 0,
        feeType: "free",
        organizer: "NSS Unit", tags: ["environment", "volunteer", "community"],
      },
      {
        title: "Alumni Networking Night",
        description: "Connect with alumni from top companies. Formal networking event.",
        category: "Other",
        date: daysFromNow(20, 18), endDate: daysFromNow(20, 21),
        venue: "Conference Hall",
        capacity: 120, registeredCount: 0,
        feeType: "paid", feeAmount: 50,
        organizer: "Alumni Association", tags: ["networking", "alumni", "career"],
      },
      // ── CANCELLED event (tests A5: cancellation exclusion) ──
      {
        title: "Cancelled: Outdoor Adventure Camp",
        description: "This event was cancelled due to weather. Used to test cancelled-event exclusion from attendance metrics.",
        category: "Other",
        date: daysFromNow(5, 8), endDate: daysFromNow(5, 18),
        venue: "Campus Grounds",
        capacity: 100, registeredCount: 40,
        feeType: "free",
        organizer: "Adventure Club", tags: ["cancelled", "outdoor"],
        isCancelled: true,
        cancelledAt: new Date(Date.now() - 3600000),
        cancelReason: "Cancelled due to forecasted heavy rain",
      },
    ].map(e => ({ ...e, imageUrl: "", isActive: true, createdBy: admin1._id }));

    const createdEvents = await Event.insertMany(eventDefs);
    console.log(`Created ${createdEvents.length} events (including 1 cancelled, 1 in 3-day auto-confirm window)`);

    // ── Registrations with tier-appropriate attendance patterns ─────────────
    const now = new Date();
    const freeUpcomingEvents = createdEvents.filter(e =>
      e.feeType === "free" && e.date > now && !e.isCancelled
    );
    const paidUpcomingEvents = createdEvents.filter(e =>
      e.feeType === "paid" && e.date > now
    );
    const pastEvents = createdEvents.filter(e => e.date <= now);
    const cancelledEvent = createdEvents.find(e => e.isCancelled);

    const registrations = [];
    let totalCheckedIn = 0;
    let anomalyCount = 0;

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

    // ── Champions (idx 0-6): 9+ attended events for 70%+ rate ───────────
    for (let i = 0; i <= 6; i++) {
      const s = students[i];
      // Register for 9 free upcoming events, check in to 7 (77.8%)
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 9);
      evts.forEach((evt, j) => {
        const ci = j < 7;
        if (ci) totalCheckedIn++;
        registrations.push(makeReg(s._id, evt._id, { checkedIn: ci }));
      });
      // Also register for / check in to 3 past events for 10 total
      for (let p = 0; p < 3 && p < pastEvents.length; p++) {
        totalCheckedIn++;
        registrations.push(makeReg(s._id, pastEvents[p]._id, { checkedIn: true }));
      }
    }

    // ── Regulars (idx 7-14): 4-7 attended events, 40-69% rate ──────────
    for (let i = 7; i <= 14; i++) {
      const s = students[i];
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 7);
      evts.forEach((evt, j) => {
        const ci = j < 4;
        if (ci) totalCheckedIn++;
        registrations.push(makeReg(s._id, evt._id, { checkedIn: ci }));
      });
      // 1 past event for slightly more data
      if (pastEvents.length > 0) {
        registrations.push(makeReg(s._id, pastEvents[0]._id, { checkedIn: true }));
        totalCheckedIn++;
      }
    }

    // ── New (idx 15-18): only 1-2 registrations, no check-ins ──────────
    for (let i = 15; i <= 18; i++) {
      const s = students[i];
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 2);
      evts.forEach(evt => {
        registrations.push(makeReg(s._id, evt._id, { checkedIn: false, confirmed: false, confirmationEmailSent: false }));
      });
    }

    // ── Unreliable (idx 19-23): many registrations, almost never check in (<25%) ──
    // Each student has a different failure pattern for the algorithm to detect
    for (let i = 19; i <= 23; i++) {
      const s = students[i];
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 10);
      evts.forEach((evt, j) => {
        const ci = j < 2;
        if (ci) totalCheckedIn++;
        registrations.push(makeReg(s._id, evt._id, { checkedIn: ci }));
      });
    }

    // ── Additional diversity for specific unreliable patterns ──────────
    // student21 (Sunil Patil): high bulk registrations — 5+ unconfirmed registrations in 1 hour
    {
      const s = students[21];
      const bulkEvts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 6);
      bulkEvts.forEach(evt => {
        registrations.push(makeReg(s._id, evt._id, {
          checkedIn: false, confirmed: false,
          confirmationEmailSent: false,
        }));
      });
    }

    // student22 (Tanvi Bhat): high cancellation rate — cancel half her registrations
    {
      const s = students[22];
      const s22Regs = registrations.filter(
        r => r.userId.toString() === s._id.toString() && !r.checkedIn
      );
      s22Regs.forEach((r, idx) => {
        if (idx % 2 === 0) {
          r.cancelledAt = new Date(Date.now() - Math.random() * 72 * 3600000);
        }
      });
    }

    // student23 (Akash Roy): high anomaly scores on check-ins
    {
      const s = students[23];
      const s23Regs = registrations.filter(
        r => r.userId.toString() === s._id.toString()
      );
      s23Regs.forEach((r, idx) => {
        if (idx % 3 === 0 && r.checkedIn) {
          r.anomalyScore = 0.8 + Math.random() * 0.15;
          r.flagged = true;
          r.flagReason = 'Suspicious check-in pattern (frequent no-show + occasional odd check-in)';
        }
      });
    }

    // student24 (banned): registrations but no check-ins (ghost attendee)
    {
      const s = students[24];
      const evts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 5);
      evts.forEach(evt => {
        registrations.push(makeReg(s._id, evt._id, { checkedIn: false, confirmed: false, confirmationEmailSent: false }));
      });
    }

    // ── Normal check-ins (35+ for IF baseline) ──────────────────────────
    // Add extra check-ins from various students to reach the 35+ baseline
    // Using Regular students for extra spread
    for (let i = 7; i <= 14; i++) {
      const s = students[i];
      const extraEvts = [...freeUpcomingEvents].sort(() => Math.random() - 0.5).slice(0, 3);
      extraEvts.forEach(evt => {
        const exists = registrations.find(
          r => r.userId.toString() === s._id.toString() && r.eventId.toString() === evt._id.toString()
        );
        if (!exists) {
          registrations.push(makeReg(s._id, evt._id, { checkedIn: true }));
          totalCheckedIn++;
        }
      });
    }

    // ── 4 anomalous check-ins for IF demo ─────────────────────────────────
    const anomalousStudents = [students[19], students[20], students[0], students[7]];
    const anomalyTimes = [
      { hour: 3, reason: 'Suspicious check-in time (early morning)' },
      { hour: 23, reason: 'Suspicious check-in time (late night)' },
      { hour: 4, reason: 'Suspicious check-in time (early morning)' },
      { hour: 1, reason: 'Suspicious check-in time (very early morning)' },
    ];

    for (let a = 0; a < anomalousStudents.length; a++) {
      const s = anomalousStudents[a];
      if (freeUpcomingEvents.length > a) {
        const evt = freeUpcomingEvents[a];
        const exists = registrations.find(
          r => r.userId.toString() === s._id.toString() && r.eventId.toString() === evt._id.toString()
        );
        if (!exists) {
          const anomAt = new Date(evt.date);
          anomAt.setHours(anomalyTimes[a].hour, Math.floor(Math.random() * 60));
          registrations.push(makeReg(s._id, evt._id, {
            checkedIn: true,
            checkedInAt: anomAt,
            anomalyScore: 0.75 + Math.random() * 0.2,
            flagged: true,
            flagReason: anomalyTimes[a].reason,
            reviewedAt: null,
          }));
          totalCheckedIn++;
          anomalyCount++;
        }
      }
    }

    const createdRegistrations = await Registration.insertMany(registrations);
    console.log(`Created ${createdRegistrations.length} registrations (${totalCheckedIn} checked in, ${anomalyCount} anomalous)`);

    // Sync registeredCount to match actual registrations per event
    const regCounts = await Registration.aggregate([
      { $match: { cancelledAt: null } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    for (const rc of regCounts) {
      await Event.findByIdAndUpdate(rc._id, { registeredCount: rc.count });
    }
    // Refresh event docs in memory with updated counts
    for (const evt of createdEvents) {
      const match = regCounts.find(r => r._id.toString() === evt._id.toString());
      if (match) evt.registeredCount = match.count;
    }
    console.log(`Synced registeredCount for ${regCounts.length} events`);

    // ── Waitlist entries with tier diversity for priority demo ─────────────
    const fullFreeEvents = createdEvents.filter(e =>
      e.feeType === "free" && e.registeredCount >= e.capacity && e.date > now
    );
    const waitlistEntries = [];

    // Waitlist A: Champion + Regular + Unreliable on same event (priority demo)
    if (fullFreeEvents.length > 0) {
      // Champion joins LAST, but should rank FIRST due to priority
      const wlUsers = [
        { user: students[19], order: 0 }, // unreliable, joined first
        { user: students[7],  order: 1 }, // regular, joined second
        { user: students[0],  order: 2 }, // champion (demo), joined third
      ];
      wlUsers.forEach(({ user, order }) => {
        waitlistEntries.push({
          eventId: fullFreeEvents[0]._id,
          userId: user._id,
          joinedAt: new Date(Date.now() - (wlUsers.length - order) * 7200000),
          abandonedAt: null,
          wasPromoted: false,
        });
      });
    }

    // Waitlist B: Two New students + Regular (second full event)
    if (fullFreeEvents.length > 1) {
      [students[15], students[16], students[8]].forEach((s, i) => {
        waitlistEntries.push({
          eventId: fullFreeEvents[1]._id,
          userId: s._id,
          joinedAt: new Date(Date.now() - (3 - i) * 3600000),
          abandonedAt: null,
          wasPromoted: false,
        });
      });
    }

    // Waitlist C: Put student20 on the cancelled event's waitlist (should never promote)
    if (cancelledEvent) {
      waitlistEntries.push({
        eventId: cancelledEvent._id,
        userId: students[20]._id,
        joinedAt: new Date(Date.now() - 3600000),
        abandonedAt: null,
        wasPromoted: false,
      });
    }

    // student20 (Meera Iyer): high waitlist abandon — add abandoned waitlist entries
    {
      const s = students[20];
      for (let w = 0; w < 4; w++) {
        const evt = fullFreeEvents[w % Math.max(1, fullFreeEvents.length)];
        if (evt) {
          waitlistEntries.push({
            eventId: evt._id,
            userId: s._id,
            joinedAt: new Date(Date.now() - (6 + w) * 3600000),
            abandonedAt: new Date(Date.now() - (4 + w) * 3600000),
            wasPromoted: false,
          });
        }
      }
    }

    if (waitlistEntries.length > 0) {
      await Waitlist.insertMany(waitlistEntries);
    }
    console.log(`Created ${waitlistEntries.length} waitlist entries (includes Champion + Regular + Unreliable for priority demo)`);

    // ── Payment records ───────────────────────────────────────────────────────
    const payments = [];
    const paymentStatuses = ["completed", "completed", "completed", "pending", "refunded"];

    for (const evt of paidUpcomingEvents) {
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
    console.log(`    Champion:     7 (demo, student1-6)`);
    console.log(`    Regular:      8 (student7-14)`);
    console.log(`    New:          4 (student15-18)`);
    console.log(`    Unreliable:   5 (student19-23; diverse failure patterns)`);
    console.log(`    Banned:       1 (student24)`);
    console.log(`  Events:         ${createdEvents.length} (including 1 cancelled + 1 in 3-day auto-confirm window)`);
    console.log(`  Registrations:  ${createdRegistrations.length} (${totalCheckedIn} checked in, ${anomalyCount} anomalous)`);
    console.log(`  Waitlist:       ${waitlistEntries.length} entries (Champion+Regular+Unreliable on same event)`);
    console.log(`  Payments:       ${createdPayments.length} (mix of completed/pending/refunded)`);
    console.log("\nLogin credentials:");
    console.log("  admin@campusbuzz.com        / Admin@123");
    console.log("  coordinator@campusbuzz.com  / Admin@123");
    console.log("  student@campusbuzz.com      / Student@123  (Champion)");
    console.log("  student1@campusbuzz.com     / Student@123  (Champion)");
    console.log("  student15@campusbuzz.com    / Student@123  (New)");
    console.log("  student19@campusbuzz.com    / Student@123  (Unreliable)");
    console.log("\nKey demo data:");
    console.log("  • 7 Champions: each with 10+ attended events (meets minAttended: 8)");
    console.log("  • 8 Regulars: each with 5+ attended events (meets minAttended: 3)");
    console.log("  • 5 Unreliable: diverse patterns (low attendance, high waitlist-abandon, bulk-reg, high cancellation, high anomaly)");
    console.log("  • Cancelled event: tests attendance-rate exclusion");
    console.log("  • 3-day event: auto-confirmation will trigger on GET /api/events");
    console.log("  • Full free events with waitlists: Champion + Regular + Unreliable");
    console.log("  • 4 anomalous check-ins with early-morning/late-night times");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
