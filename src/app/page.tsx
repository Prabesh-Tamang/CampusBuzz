'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Zap, Calendar, QrCode, BarChart3, ArrowRight, Users, Shield } from 'lucide-react';

const features = [
  { icon: Calendar, title: 'Discover Events', desc: 'Browse technical fests, cultural nights, sports meets & more on your campus.', color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { icon: QrCode, title: 'QR Check-in', desc: 'Get your unique QR code on registration. Instant scan & verify at entry.', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { icon: BarChart3, title: 'Live Dashboard', desc: 'Admins track registrations, attendance & analytics in real time.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: Shield, title: 'Secure Auth', desc: 'Role-based access for students and admins with JWT authentication.', color: 'text-violet-400', bg: 'bg-violet-400/10' },
];

const stats = [
  { val: '50+', label: 'Events Hosted' },
  { val: '2,000+', label: 'Students Registered' },
  { val: '98%', label: 'Check-in Rate' },
  { val: '15+', label: 'Departments' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="grid-bg relative overflow-hidden px-6 pb-[100px] pt-[120px]">
        {/* Glow orb */}
        <div 
  className="pointer-events-none absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(20,184,166,0.12)_0%,transparent_70%)]" 
/>

        <div className="relative mx-auto max-w-[900px] text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5">
            <Zap size={14} className="text-teal-500" />
            <span className="text-[13px] font-bold tracking-widest text-teal-500 uppercase">
              CAMPUS EVENT PLATFORM
            </span>
          </div>

          <h1 className="mb-6 text-[clamp(48px,8vw,88px)] font-extrabold leading-[1] tracking-tighter text-white">
            Your Campus. <span className="block text-accent">Fully Alive.</span>
          </h1>

          <p className="mx-auto mb-12 max-w-[560px] text-lg leading-relaxed text-muted-foreground">
            Discover, register, and attend the best events at your college — all in one place. 
            QR check-in, live tracking, and instant notifications.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/events">
              <button className="btn-primary flex items-center gap-2.5 px-9 py-4 text-base">
                Explore Events <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/auth/signup">
              <button className="btn-ghost px-9 py-4 text-base">
                Get Started Free
              </button>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mx-auto mt-20 grid max-w-[800px] grid-cols-2 overflow-hidden rounded-2xl bg-border md:grid-cols-4 gap-[1px]">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-6 text-center">
              <div className="text-3xl font-extrabold leading-none text-accent">{s.val}</div>
              <div className="mt-1.5 text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-[1200px] px-6 py-[100px]">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-[clamp(32px,5vw,52px)] font-extrabold tracking-tighter text-white">
            Everything you need
          </h2>
          <p className="text-lg text-muted-foreground">Built for students, designed for admins.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card p-8">
              <div className={`mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ${f.bg}`}>
                <f.icon size={24} className={f.color} />
              </div>
              <h3 className="mb-2.5 text-xl font-bold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-[100px]">
        <div className="glow-teal mx-auto max-w-[700px] rounded-[24px] border border-teal-500/30 bg-gradient-to-br from-surface to-[#0a1a19] px-12 py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
            <Users size={28} className="text-[#042f2e]" />
          </div>
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-white">
            Ready to join CollegePulse?
          </h2>
          <p className="mb-8 text-base leading-relaxed text-muted-foreground">
            Create your free account and never miss a campus event again.
          </p>
          <Link href="/auth/signup">
            <button className="btn-primary px-10 py-4 text-base">
              Create Free Account
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          © 2025 CollegePulse. Built with ❤️ for campus life.
        </p>
      </footer>
    </div>
  );
}