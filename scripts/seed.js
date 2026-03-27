// scripts/seed.js
// Run: node scripts/seed.js
// This will create a demo admin and sample events

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Schemas
const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true },
  password: String, role: String, college: String, createdAt: { type: Date, default: Date.now }
});
const EventSchema = new mongoose.Schema({
  title: String, description: String, category: String, date: Date,
  time: String, venue: String, capacity: Number, registeredCount: { type: Number, default: 0 },
  image: String, organizer: String, tags: [String], isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

const sampleEvents = [
  {
    title: 'AI & Machine Learning Summit 2025',
    description: 'Join us for an exciting day of talks, demos, and workshops covering the latest in artificial intelligence and machine learning. Industry experts and professors will share cutting-edge research and real-world applications.',
    category: 'Tech',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    time: '10:00 AM',
    venue: 'Main Auditorium, Block A',
    capacity: 200,
    organizer: 'Computer Science Department',
    tags: ['ai', 'machine-learning', 'tech', 'summit'],
  },
  {
    title: 'Annual Cultural Fest — VIBRANCE 2025',
    description: 'The biggest cultural event of the year! Dance, music, drama, art exhibitions, and food stalls from across 20+ states. A celebration of diversity and creativity.',
    category: 'Cultural',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    time: '11:00 AM',
    venue: 'College Ground & Open Stage',
    capacity: 500,
    organizer: 'Cultural Committee',
    tags: ['cultural', 'dance', 'music', 'fest'],
  },
  {
    title: 'Web Development Bootcamp',
    description: 'A hands-on 2-day bootcamp covering modern web development from basics to advanced. Learn HTML, CSS, JavaScript, React, and Next.js with expert mentors.',
    category: 'Workshop',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    time: '9:00 AM',
    venue: 'Computer Lab 301',
    capacity: 60,
    organizer: 'Web Dev Club',
    tags: ['web', 'react', 'nextjs', 'coding'],
  },
  {
    title: 'Inter-College Basketball Tournament',
    description: 'Annual inter-college basketball tournament featuring 16 teams from across the region. Come witness thrilling matches and cheer for our college team!',
    category: 'Sports',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    time: '8:00 AM',
    venue: 'Sports Complex - Basketball Courts',
    capacity: 300,
    organizer: 'Sports Committee',
    tags: ['basketball', 'sports', 'tournament'],
  },
  {
    title: 'Career Development Seminar',
    description: 'Industry leaders from top MNCs will share insights on career planning, resume building, interview preparation, and future career trends for engineering students.',
    category: 'Seminar',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    time: '2:00 PM',
    venue: 'Seminar Hall 2, Admin Block',
    capacity: 150,
    organizer: 'Placement Cell',
    tags: ['career', 'placement', 'industry', 'jobs'],
  },
  {
    title: 'Hackathon 2025 — Build for Tomorrow',
    description: '36-hour hackathon where teams of 3-5 build innovative solutions to real-world problems. Exciting prizes worth ₹1,00,000! Open to all branches.',
    category: 'Tech',
    date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    time: '6:00 PM',
    venue: 'Innovation Hub, New Building',
    capacity: 120,
    organizer: 'Tech Club & IEEE Student Chapter',
    tags: ['hackathon', 'coding', 'innovation', 'prizes'],
  },
];

async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@collegepulse.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        name: 'Admin User',
        email: 'admin@collegepulse.com',
        password: hashedPassword,
        role: 'admin',
        college: 'CollegePulse University',
      });
      console.log('👤 Admin created: admin@collegepulse.com / admin123');
    } else {
      console.log('👤 Admin already exists');
    }

    // Create sample student
    const studentExists = await User.findOne({ email: 'student@collegepulse.com' });
    if (!studentExists) {
      const hashedPassword = await bcrypt.hash('student123', 12);
      await User.create({
        name: 'Demo Student',
        email: 'student@collegepulse.com',
        password: hashedPassword,
        role: 'student',
        college: 'CollegePulse University',
      });
      console.log('🎓 Student created: student@collegepulse.com / student123');
    }

    // Create events
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      await Event.insertMany(sampleEvents);
      console.log(`📅 Created ${sampleEvents.length} sample events`);
    } else {
      console.log(`📅 ${eventCount} events already exist`);
    }

    console.log('\n🎉 Seed complete! You can now run: npm run dev');
    console.log('   Admin login: admin@collegepulse.com / admin123');
    console.log('   Student login: student@collegepulse.com / student123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
