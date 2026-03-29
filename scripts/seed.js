const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
// Load environment variables
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
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const RegistrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  registrationId: String,
  qrCode: String,
  checkedIn: { type: Boolean, default: false },
  checkedInAt: Date,
  anomalyScore: Number,
  flagged: { type: Boolean, default: false },
  adminOverride: { type: Boolean, default: false },
}, { timestamps: true });

const WaitlistSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priorityScore: Number,
  joinedAt: Date,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);
const Waitlist = mongoose.models.Waitlist || mongoose.model("Waitlist", WaitlistSchema);

function randomDate(daysFromNow, hour = null) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  if (hour !== null) d.setHours(hour, 0, 0, 0);
  return d;
}

function generateRegId() {
  const crypto = require("crypto");
  return "CP-" + crypto.randomBytes(8).toString("hex").toUpperCase();
}

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    await Registration.deleteMany({});
    await Waitlist.deleteMany({});
    console.log("Cleared existing data");

    // Create admin
    const adminPassword = await bcrypt.hash("Admin@123", 12);
    const admin = await User.create({
      name: "Campus Admin",
      email: "admin@campusbuzz.com",
      password: adminPassword,
      role: "admin",
      college: "CampusBuzz University",
    });
    console.log("Admin created: admin@campusbuzz.com / Admin@123");

    // Create 14 students
    const studentPassword = await bcrypt.hash("Student@123", 12);
    const students = [];
    
    const student0 = await User.create({
      name: "Demo Student",
      email: "student@campusbuzz.com",
      password: studentPassword,
      role: "student",
      college: "CampusBuzz University",
    });
    students.push(student0);

    for (let i = 1; i <= 13; i++) {
      const student = await User.create({
        name: `Student ${i}`,
        email: `student${i}@campusbuzz.com`,
        password: studentPassword,
        role: "student",
        college: "CampusBuzz University",
      });
      students.push(student);
    }
    console.log(`Created ${students.length} students`);

    // Create 8 events with specific mix
    const now = new Date();
    
    const events = [
      // 1. Full capacity event (for waitlist demo)
      {
        title: "Hackathon 2026 — Build for Tomorrow",
        description: "36-hour hackathon with teams of 3-5 building innovative solutions. Prizes worth ₹1,00,000!",
        category: "Technical",
        date: randomDate(14, 9),
        endDate: randomDate(15, 21),
        venue: "Innovation Hub, New Building",
        capacity: 50,
        registeredCount: 50,
        organizer: "Tech Club",
        tags: ["hackathon", "coding", "prizes"],
        createdBy: admin._id,
      },
      // 2. Full capacity event (for waitlist demo)
      {
        title: "AI & Machine Learning Summit 2026",
        description: "Industry experts sharing cutting-edge research in AI and ML.",
        category: "Technical",
        date: randomDate(21, 10),
        endDate: randomDate(21, 17),
        venue: "Main Auditorium, Block A",
        capacity: 100,
        registeredCount: 100,
        organizer: "CS Department",
        tags: ["ai", "ml", "tech"],
        createdBy: admin._id,
      },
      // 3. <20% spots left (amber badge)
      {
        title: "Web Development Bootcamp",
        description: "Hands-on 2-day bootcamp covering modern web dev. Learn React and Next.js.",
        category: "Workshop",
        date: randomDate(7, 9),
        endDate: randomDate(8, 17),
        venue: "Computer Lab 301",
        capacity: 50,
        registeredCount: 42,
        organizer: "Web Dev Club",
        tags: ["web", "react", "nextjs"],
        createdBy: admin._id,
      },
      // 4. <20% spots left (amber badge)
      {
        title: "Annual Cultural Fest — VIBRANCE 2026",
        description: "The biggest cultural event! Dance, music, drama from 20+ states.",
        category: "Cultural",
        date: randomDate(10, 11),
        endDate: randomDate(10, 23),
        venue: "College Ground",
        capacity: 400,
        registeredCount: 360,
        organizer: "Cultural Committee",
        tags: ["cultural", "dance", "music"],
        createdBy: admin._id,
      },
      // 5. >50% spots left (green badge)
      {
        title: "Inter-College Basketball Tournament",
        description: "16 teams from across the region competing in thrilling matches.",
        category: "Sports",
        date: randomDate(18, 8),
        endDate: randomDate(19, 18),
        venue: "Sports Complex",
        capacity: 300,
        registeredCount: 80,
        organizer: "Sports Committee",
        tags: ["basketball", "sports", "tournament"],
        createdBy: admin._id,
      },
      // 6. >50% spots left (green badge)
      {
        title: "Career Development Seminar",
        description: "Industry leaders on career planning, resume building, and interview prep.",
        category: "Seminar",
        date: randomDate(5, 14),
        endDate: randomDate(5, 17),
        venue: "Seminar Hall 2",
        capacity: 150,
        registeredCount: 45,
        organizer: "Placement Cell",
        tags: ["career", "placement", "jobs"],
        createdBy: admin._id,
      },
      // 7. Past event (should not appear on /events)
      {
        title: "Past Tech Talk 2025",
        description: "This event has already happened.",
        category: "Technical",
        date: randomDate(-30, 10),
        endDate: randomDate(-30, 12),
        venue: "Conference Room",
        capacity: 100,
        registeredCount: 65,
        organizer: "Tech Club",
        tags: ["tech", "talk"],
        createdBy: admin._id,
      },
      // 8. 0 registrations (cold start for CF)
      {
        title: "New Workshop: IoT Fundamentals",
        description: "Learn Internet of Things from scratch. Perfect for beginners!",
        category: "Workshop",
        date: randomDate(25, 10),
        endDate: randomDate(25, 16),
        venue: "Electronics Lab",
        capacity: 40,
        registeredCount: 0,
        organizer: "Electronics Club",
        tags: ["iot", "hardware", "beginners"],
        createdBy: admin._id,
      },
    ];

    const createdEvents = await Event.insertMany(events);
    console.log(`Created ${createdEvents.length} events`);

    // Create 80+ registrations across events
    const registrations = [];
    const checkedInCount = { value: 0 };
    const anomalyCount = { value: 0 };

    for (const student of students) {
      // Each student registers for 6-8 random events (not past, not full)
      const eligibleEvents = createdEvents.filter(e => 
        e.date > now && e.registeredCount < e.capacity
      );
      
      const numRegs = Math.floor(Math.random() * 3) + 6; // 6-8 registrations per student
      const selectedEvents = eligibleEvents
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(numRegs, eligibleEvents.length));

      for (const evt of selectedEvents) {
        const isCheckedIn = checkedInCount.value < 45 && Math.random() > 0.3;
        if (isCheckedIn) checkedInCount.value++;

        let checkedInAt = null;
        let anomalyScore = null;
        let flagged = false;

        // Create 3 anomalous check-ins
        if (anomalyCount.value < 3 && Math.random() > 0.95) {
          anomalyCount.value++;
          checkedInAt = randomDate(0, 3); // 3 AM
          anomalyScore = 0.75 + Math.random() * 0.2;
          flagged = true;
        } else if (isCheckedIn) {
          // Normal check-in: 1-3 hours before event, reasonable times
          const hourBefore = evt.date.getHours() - (Math.random() * 2 + 1);
          checkedInAt = new Date(evt.date);
          checkedInAt.setHours(Math.max(8, hourBefore), Math.floor(Math.random() * 60));
        }

        registrations.push({
          userId: student._id,
          eventId: evt._id,
          registrationId: generateRegId(),
          qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
          checkedIn: isCheckedIn,
          checkedInAt: checkedInAt,
          anomalyScore: anomalyScore,
          flagged: flagged,
          adminOverride: false,
        });
      }
    }

    await Registration.insertMany(registrations);
    console.log(`Created ${registrations.length} registrations (${checkedInCount.value} checked in, ${anomalyCount.value} anomalous)`);

    // Create waitlist for full-capacity events
    const waitlistEntries = [];
    const fullEvents = createdEvents.filter(e => e.registeredCount >= e.capacity);
    let waitlistIdx = 0;

    for (const evt of fullEvents) {
      // Add 2-3 students to each full event's waitlist
      const numWaitlisted = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numWaitlisted && waitlistIdx < students.length; i++) {
        waitlistEntries.push({
          eventId: evt._id,
          userId: students[waitlistIdx]._id,
          priorityScore: Date.now() - (i * 3600000), // Earlier = higher priority
          joinedAt: new Date(Date.now() - (i * 3600000)),
        });
        waitlistIdx++;
      }
    }

    await Waitlist.insertMany(waitlistEntries);
    console.log(`Created ${waitlistEntries.length} waitlist entries`);

    console.log("\n=== Seed Complete ===");
    console.log("Accounts:");
    console.log("  admin@campusbuzz.com / Admin@123");
    console.log("  student@campusbuzz.com / Student@123");
    console.log("  student1@campusbuzz.com ... student13@campusbuzz.com (same password)");
    console.log("\nEvents: 8 total (2 full, 2 amber, 2 green, 1 past, 1 empty)");
    console.log("Registrations:", registrations.length, "total");
    console.log("Waitlist:", waitlistEntries.length, "entries");
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
