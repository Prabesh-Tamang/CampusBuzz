// 'use client';
// import { useState, useEffect } from 'react';
// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import Navbar from '@/components/Navbar';
// import Link from 'next/link';
// import { Calendar, Users, QrCode, TrendingUp, Plus, BarChart2, ChevronRight, CheckCircle } from 'lucide-react';
// import { format } from 'date-fns';

// interface Stats {
//   totalEvents: number;
//   totalUsers: number;
//   totalRegistrations: number;
//   checkedInCount: number;
//   recentEvents: Array<{ _id: string; title: string; date: string; registeredCount: number; capacity: number; category: string }>;
// }

// export default function DashboardPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [stats, setStats] = useState<Stats | null>(null);

//   useEffect(() => {
//     if (status === 'unauthenticated') { router.push('/auth/login'); return; }
//     if (status === 'authenticated') {
//       const isAdmin = (session?.user as { role?: string })?.role === 'admin';
//       if (!isAdmin) { router.push('/events'); return; }
//       fetch('/api/admin/stats').then(r => r.json()).then(setStats);
//     }
//   }, [status, session]);

//   if (!stats) return (
//     <div>
//       <Navbar />
//       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
//         <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
//       </div>
//     </div>
//   );

//   const statCards = [
//     { label: 'Total Events', value: stats.totalEvents, icon: Calendar, color: '#14b8a6', bg: 'rgba(20,184,166,0.1)' },
//     { label: 'Students', value: stats.totalUsers, icon: Users, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
//     { label: 'Registrations', value: stats.totalRegistrations, icon: TrendingUp, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
//     { label: 'Checked In', value: stats.checkedInCount, icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
//   ];

//   return (
//     <div>
//       <Navbar />
//       <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
//         {/* Header */}
//         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
//           <div>
//             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
//               <div style={{ width: 8, height: 8, background: '#14b8a6', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
//               <span style={{ fontSize: 12, color: '#14b8a6', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin Dashboard</span>
//             </div>
//             <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
//               Control Center
//             </h1>
//           </div>
//           <div style={{ display: 'flex', gap: 12 }}>
//             <Link href="/dashboard/scanner">
//               <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//                 <QrCode size={18} /> QR Scanner
//               </button>
//             </Link>
//             <Link href="/dashboard/events">
//               <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//                 <Plus size={18} /> New Event
//               </button>
//             </Link>
//           </div>
//         </div>

//         {/* Stats Grid */}
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}>
//           {statCards.map((s) => (
//             <div key={s.label} className="card" style={{ padding: 28 }}>
//               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
//                 <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
//                 <div style={{ width: 40, height: 40, background: s.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                   <s.icon size={20} color={s.color} />
//                 </div>
//               </div>
//               <div style={{ fontSize: 40, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
//             </div>
//           ))}
//         </div>

//         {/* Attendance Rate */}
//         {stats.totalRegistrations > 0 && (
//           <div className="card" style={{ padding: 28, marginBottom: 32 }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
//               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Overall Attendance Rate</h3>
//               <span style={{ fontSize: 24, fontWeight: 800, color: '#14b8a6' }}>
//                 {Math.round((stats.checkedInCount / stats.totalRegistrations) * 100)}%
//               </span>
//             </div>
//             <div style={{ height: 12, background: 'var(--surface2)', borderRadius: 6, overflow: 'hidden' }}>
//               <div style={{
//                 height: '100%',
//                 width: `${(stats.checkedInCount / stats.totalRegistrations) * 100}%`,
//                 background: 'linear-gradient(90deg, #14b8a6, #0d9488)',
//                 borderRadius: 6,
//                 transition: 'width 1s ease',
//               }} />
//             </div>
//             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
//               <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.checkedInCount} checked in</span>
//               <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.totalRegistrations} total registered</span>
//             </div>
//           </div>
//         )}

//         {/* Recent Events */}
//         <div className="card" style={{ padding: 28 }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
//             <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Recent Events</h3>
//             <Link href="/dashboard/events" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
//               Manage all <ChevronRight size={14} />
//             </Link>
//           </div>

//           {stats.recentEvents.length === 0 ? (
//             <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
//               <p style={{ marginBottom: 16 }}>No events yet. Create your first one!</p>
//               <Link href="/dashboard/events">
//                 <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
//                   <Plus size={16} /> Create Event
//                 </button>
//               </Link>
//             </div>
//           ) : (
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
//               {stats.recentEvents.map((event, i) => (
//                 <div key={event._id} style={{
//                   display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//                   padding: '16px 0',
//                   borderBottom: i < stats.recentEvents.length - 1 ? '1px solid var(--border)' : 'none',
//                 }}>
//                   <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
//                     <div style={{ width: 44, height: 44, background: 'var(--surface2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                       <Calendar size={20} color="#14b8a6" />
//                     </div>
//                     <div>
//                       <div style={{ fontWeight: 700, marginBottom: 4 }}>{event.title}</div>
//                       <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
//                         {format(new Date(event.date), 'MMM d, yyyy')} · {event.category}
//                       </div>
//                     </div>
//                   </div>
//                   <div style={{ textAlign: 'right' }}>
//                     <div style={{ fontWeight: 700, color: '#14b8a6' }}>{event.registeredCount}/{event.capacity}</div>
//                     <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>registered</div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Calendar, Users, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }

    if (status === 'authenticated') {
      const isAdmin = (session?.user as any)?.role === 'admin'
      if (!isAdmin) {
        router.push('/events')
        return
      }

      fetch('/api/admin/stats')
        .then(res => res.json())
        .then(setStats)
    }
  }, [status, session])

  if (!stats) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-700 rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-500">
              Manage events and monitor campus activity.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard
              icon={<Calendar size={20} />}
              label="Total Events"
              value={stats.totalEvents}
            />
            <StatCard
              icon={<Users size={20} />}
              label="Registered Students"
              value={stats.totalUsers}
            />
            <StatCard
              icon={<CheckCircle size={20} />}
              label="Checked In"
              value={stats.checkedInCount}
            />
          </div>

          {/* Recent Events */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Recent Events
            </h3>

            {stats.recentEvents.length === 0 ? (
              <p className="text-gray-500">No events available.</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {stats.recentEvents.map((event: any) => (
                  <div key={event._id} className="py-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">
                        {event.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(event.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {event.registeredCount}/{event.capacity} registered
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

function StatCard({ icon, label, value }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3 text-blue-700">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-gray-900">
        {value}
      </div>
    </div>
  )
}