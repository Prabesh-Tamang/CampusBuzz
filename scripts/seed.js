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

    // Drop all collections for a clean state (Req 15.6)
    await User.deleteMany({});
    await Event.deleteMany({});
    await Registration.deleteMany({});
    await Waitlist.deleteMany({});
    await Payment.deleteMany({});
    console.log("Cleared existing data");

    // ── Admin users (Req 15.1: at least 2) ──────────────────────────────────
    const adminPassword = await bcrypt.hash("Admin@123", 12);
    const [admin1, admin2] = await User.insertMany([
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

    // ── Student users (Req 15.1: at least 10) ───────────────────────────────
    const studentPassword = await bcrypt.hash("Student@123", 12);
    const studentDocs = [
      { name: "Demo Student", email: "student@campusbuzz.com" },
      ...Array.from({ length: 13 }, (_, i) => ({
        name: `Student ${i + 1}`,
        email: `student${i + 1}@campusbuzz.com`,
      })),
    ].map(s => ({ ...s, password: studentPassword, role: "student", college: "CampusBuzz University" }));

    const students = await User.insertMany(studentDocs);
    console.log(`Created ${students.length} student users`);

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

    // ── Registrations (Req 15.3) ─────────────────────────────────────────────
    const now = new Date();
    const freeUpcomingEvents = createdEvents.filter(e =>
      e.feeType === "free" && e.date > now && e.registeredCount < e.capacity
    );
    const paidUpcomingEvents = createdEvents.filter(e =>
      e.feeType === "paid" && e.date > now
    );

    const registrations = [];
    let checkedInCount = 0;
    let anomalyCount = 0;

    for (const student of students) {
      // Each student registers for 4-6 free upcoming events
      const shuffled = [...freeUpcomingEvents].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(5, shuffled.length));

      for (const evt of selected) {
        const isCheckedIn = checkedInCount < 50 && Math.random() > 0.4;
        if (isCheckedIn) checkedInCount++;

        let checkedInAt = null;
        let anomalyScore = null;
        let flagged = false;

        if (anomalyCount < 3 && Math.random() > 0.97) {
          // Anomalous check-in (3 AM, high score)
          anomalyCount++;
          checkedInAt = new Date(evt.date);
          checkedInAt.setHours(3, Math.floor(Math.random() * 60));
          anomalyScore = 0.75 + Math.random() * 0.2;
          flagged = true;
        } else if (isCheckedIn) {
          // Normal check-in: 30-90 min before event start
          checkedInAt = new Date(evt.date.getTime() - (30 + Math.random() * 60) * 60000);
          anomalyScore = Math.random() * 0.3; // low score
        }

        registrations.push({
          userId: student._id,
          eventId: evt._id,
          registrationId: generateRegId(),
          qrCode: PLACEHOLDER_QR,
          checkedIn: isCheckedIn,
          checkedInAt,
          anomalyScore,
          flagged,
          adminOverride: false,
        });
      }
    }

    const createdRegistrations = await Registration.insertMany(registrations);
    console.log(`Created ${createdRegistrations.length} registrations (${checkedInCount} checked in, ${anomalyCount} anomalous)`);

    // ── Waitlist entries (Req 15.4) ──────────────────────────────────────────
    const fullEvents = createdEvents.filter(e => e.registeredCount >= e.capacity && e.date > now);
    const waitlistEntries = [];
    let wIdx = 0;

    for (const evt of fullEvents) {
      const slots = Math.floor(Math.random() * 2) + 2; // 2-3 per full event
      for (let i = 0; i < slots && wIdx < students.length; i++, wIdx++) {
        waitlistEntries.push({
          eventId: evt._id,
          userId: students[wIdx]._id,
          priorityScore: Date.now() - i * 3_600_000,
          joinedAt: new Date(Date.now() - i * 3_600_000),
        });
      }
    }

    await Waitlist.insertMany(waitlistEntries);
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

    // ── Summary (Req 15.7) ───────────────────────────────────────────────────
    console.log("\n=== Seed Complete ===");
    console.log(`  Admin users:    2`);
    console.log(`  Student users:  ${students.length}`);
    console.log(`  Events:         ${createdEvents.length} (across all 7 categories)`);
    console.log(`  Registrations:  ${createdRegistrations.length} (${checkedInCount} checked in, ${anomalyCount} anomalous)`);
    console.log(`  Waitlist:       ${waitlistEntries.length} entries`);
    console.log(`  Payments:       ${createdPayments.length} (mix of completed/pending/refunded)`);
    console.log("\nLogin credentials:");
    console.log("  admin@campusbuzz.com        / Admin@123");
    console.log("  coordinator@campusbuzz.com  / Admin@123");
    console.log("  student@campusbuzz.com      / Student@123");
    console.log("  student1@campusbuzz.com ... student13@campusbuzz.com / Student@123");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
