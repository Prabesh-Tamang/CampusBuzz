"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import {
  Zap,
  Calendar,
  QrCode,
  BarChart3,
  ArrowRight,
  Users,
  Shield,
  MapPin,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

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

const stats = [
  { val: "50+", label: "Events Hosted" },
  { val: "2,000+", label: "Students Registered" },
  { val: "98%", label: "Check-in Rate" },
  { val: "15+", label: "Departments" },
];

interface Event {
  _id: string;
  title: string;
  date: string;
  venue: string;
  category: string;
  capacity: number;
  registeredCount: number;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [popularEvents, setPopularEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const upcoming = data
            .filter((e: Event) => new Date(e.date) >= new Date())
            .sort((a: Event, b: Event) => b.registeredCount - a.registeredCount)
            .slice(0, 3);
          setPopularEvents(upcoming);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

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
            Discover, register, and attend the best events at your college — all
            in one place. QR check-in, live tracking, and instant notifications.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/events">
              <button className="btn-primary flex items-center gap-2.5 px-9 py-4 text-base">
                Explore Events <ArrowRight size={18} />
              </button>
            </Link>
            {!session && (
              <Link href="/auth/signup">
                <button className="btn-ghost px-9 py-4 text-base">
                  Get Started Free
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="mx-auto mt-20 grid max-w-[800px] grid-cols-2 overflow-hidden rounded-2xl bg-border md:grid-cols-4 gap-[1px]">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-6 text-center">
              <div className="text-3xl font-extrabold leading-none text-accent">
                {s.val}
              </div>
              <div className="mt-1.5 text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Events Section */}
      {loading ? (
        <section className="mx-auto max-w-[1200px] px-6 py-[60px]">
          <div className="mb-8">
            <h2 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-tighter text-white mb-1">
              Trending Events
            </h2>
            <p className="text-muted-foreground">
              Most popular events on campus right now
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-20 bg-surface2 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-surface2 rounded animate-pulse" />
                </div>
                <div className="h-7 w-full bg-surface2 rounded animate-pulse mb-3" />
                <div className="h-4 w-3/4 bg-surface2 rounded animate-pulse mb-2" />
                <div className="h-4 w-1/2 bg-surface2 rounded animate-pulse mb-4" />
                <div className="h-2 w-full bg-surface2 rounded animate-pulse mt-6" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        popularEvents.length > 0 && (
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {popularEvents.map((event) => (
                <Link key={event._id} href={`/events/${event._id}`}>
                  <div className="card p-6 hover:border-pulse-500/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`badge cat-${event.category}`}>
                        {event.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {event.registeredCount}/{event.capacity} spots filled
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3 group-hover:text-accent transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-accent" />
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-accent" />
                        {event.venue}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Popularity
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-dark-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full"
                              style={{
                                width: `${(event.registeredCount / event.capacity) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
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
        <div className="glow-teal mx-auto max-w-[600px] rounded-2xl border border-teal-500/30 bg-gradient-to-br from-surface to-[#0a1a19] px-10 py-12 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
            <Users size={24} className="text-[#042f2e]" />
          </div>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white">
            Ready to get started?
          </h2>
          <p className="mb-6 text-muted-foreground">
            Join thousands of students discovering campus events.
          </p>
          <Link href={session ? "/events" : "/auth/signup"}>
            <button className="btn-primary px-8 py-3">
              {session ? "Browse Events" : "Create Free Account"}
            </button>
          </Link>
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
