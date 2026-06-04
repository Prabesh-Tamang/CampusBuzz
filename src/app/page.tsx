import Link from "next/link";
import Navbar from "@/components/Navbar";
import { HeroCTA, CtaLink } from "@/components/HeroCTA";
import connectDB from "@/lib/mongodb";
import Event from "@/models/Event";
import User from "@/models/User";
import Registration from "@/models/Registration";
import TitleSetter from "@/components/TitleSetter";
import EventCard from "@/components/EventCard";
import {
  Zap,
  Calendar,
  QrCode,
  BarChart3,
  Users,
  Shield,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Discover Events",
    desc: "Browse technical fests, cultural nights, sports meets & more on your campus.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    icon: QrCode,
    title: "QR Check-in",
    desc: "Get your unique QR code on registration. Instant scan & verify at entry.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: BarChart3,
    title: "Live Dashboard",
    desc: "Admins track registrations, attendance & analytics in real time.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Secure Auth",
    desc: "Role-based access for students and admins with JWT authentication.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
];

interface EventDoc {
  _id: string;
  title: string;
  date: string;
  venue: string;
  category: string;
  capacity: number;
  registeredCount: number;
  imageUrl?: string;
}

export default async function HomePage() {
  await connectDB();

  const now = new Date();

  const [totalEvents, totalStudents, totalCheckins, upcomingEvents] =
    await Promise.all([
      Event.countDocuments({ isActive: true, isCancelled: { $ne: true } }),
      User.countDocuments({ role: "student" }),
      Registration.countDocuments({ checkedIn: true }),
      Event.find({
        isActive: true,
        isCancelled: { $ne: true },
        date: { $gte: now },
      })
        .sort({ registeredCount: -1 })
        .limit(6)
        .select(
          "_id title description category date venue capacity registeredCount feeType feeAmount imageUrl"
        )
        .lean(),
    ]);

  const checkinRate =
    totalStudents > 0
      ? Math.round((totalCheckins / totalStudents) * 100)
      : 0;

  const stats = [
    { val: String(totalEvents), label: "Events Hosted" },
    { val: String(totalStudents), label: "Students Registered" },
    { val: `${checkinRate}%`, label: "Check-in Rate" },
    { val: "15+", label: "Departments" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <TitleSetter title="Home" />

      {/* Hero Section */}
      <section className="grid-bg relative overflow-hidden px-6 pb-[80px] pt-[120px]">
        <div className="pointer-events-none absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(20,184,166,0.12)_0%,transparent_70%)]" />

        <div className="relative mx-auto max-w-[900px] text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5">
            <Zap size={14} className="text-teal-500" />
            <span className="text-[13px] font-bold tracking-widest text-teal-500 uppercase">
              Campus Event Platform
            </span>
          </div>

          <h1 className="mb-6 text-[clamp(48px,8vw,88px)] font-extrabold leading-[1] tracking-tighter text-white">
            Your Campus. <span className="block text-accent">Fully Alive.</span>
          </h1>

          <p className="mx-auto mb-12 max-w-[560px] text-lg leading-relaxed text-muted-foreground">
            Discover, register, and attend the best events at your college.All
            in one place. QR check-in, live tracking, and instant notifications.
          </p>

          <HeroCTA />
        </div>

        {/* Stats bar — server rendered with real data, no flash */}
        <div className="mx-auto mt-20 grid max-w-[800px] grid-cols-2 overflow-hidden rounded-2xl bg-border md:grid-cols-4 gap-[1px]">
          {stats.map((s) => (
            <StatCard key={s.label} val={s.val} label={s.label} />
          ))}
        </div>
      </section>

      {/* Popular Events Section */}
      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 py-[60px]">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-tighter text-white">
                Trending Events
              </h2>
              <p className="text-muted-foreground mt-1">
                Most popular events on campus right now
              </p>
            </div>
            <Link href="/events">
              <button className="btn-ghost flex items-center gap-2 text-sm">
                Browse All <ArrowRight size={16} />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event: any, i: number) => (
              <EventCard key={event._id.toString()} event={event} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="mx-auto max-w-[1200px] px-6 py-[60px]">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-[clamp(28px,4vw,40px)] font-extrabold tracking-tighter text-white">
            Everything you need
          </h2>
          <p className="text-lg text-muted-foreground">
            Built for students, designed for admins.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}
              >
                <f.icon size={22} className={f.color} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-[80px]">
        <div className="glow-teal mx-auto max-w-[600px] rounded-2xl border border-teal-500/30 bg-gradient-to-br from-[#0d1f1e] to-[#050d0c] px-10 py-12 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
            <Users size={24} className="text-[#042f2e]" />
          </div>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white">
            Ready to get started?
          </h2>
          <p className="mb-6 text-muted-foreground">
            Join thousands of students discovering campus events.
          </p>
          <CtaLink />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          © 2025 CampusBuzz. Built for campus life.
        </p>
      </footer>
    </div>
  );
}

function StatCard({ val, label }: { val: string; label: string }) {
  // If the value already contains + or % don't append anything
  const alreadyFormatted = val.includes("+") || val.includes("%");
  const num = parseInt(val.replace(/[^0-9]/g, "")) || 0;
  const showPlus = !alreadyFormatted && num > 0;

  return (
    <div className="bg-[#0d1f1e] px-5 py-6 text-center">
      <div className="text-3xl font-extrabold leading-none text-[#14b8a6]">
        {val}{showPlus && "+"}
      </div>
      <div className="mt-1.5 text-[12px] font-semibold tracking-wider text-[#6b9e99] uppercase">
        {label}
      </div>
    </div>
  );
}
