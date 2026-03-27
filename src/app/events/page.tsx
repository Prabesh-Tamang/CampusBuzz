// 'use client';
// import { useState, useEffect } from 'react';
// import Navbar from '@/components/Navbar';
// import { Search, Filter, Calendar, MapPin, Users } from 'lucide-react';
// import Link from 'next/link';
// import { format } from 'date-fns';

// const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'];

// interface Event {
//   _id: string;
//   title: string;
//   description: string;
//   category: string;
//   date: string;
//   venue: string;
//   capacity: number;
//   registeredCount: number;
//   imageUrl: string;
//   organizer: string;
//   tags: string[];
// }

// export default function EventsPage() {
//   const [events, setEvents] = useState<Event[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [category, setCategory] = useState('All');

//   useEffect(() => {
//     fetchEvents();
//   }, [search, category]);

//   async function fetchEvents() {
//     setLoading(true);
//     const params = new URLSearchParams();
//     if (search) params.set('search', search);
//     if (category !== 'All') params.set('category', category);
//     const res = await fetch(`/api/events?${params}`);
//     const data = await res.json();
//     setEvents(Array.isArray(data) ? data : []);
//     setLoading(false);
//   }

//   const getSpots = (e: Event) => e.capacity - e.registeredCount;

//   return (
//     <div>
//       <Navbar />
//       <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
//         {/* Header */}
//         <div style={{ marginBottom: 48 }}>
//           <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.03em' }}>
//             All Events
//           </h1>
//           <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Find and register for campus events that match your interests</p>
//         </div>

//         {/* Filters */}
//         <div style={{ display: 'flex', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
//           <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
//             <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
//             <input
//               className="input"
//               style={{ paddingLeft: 40 }}
//               placeholder="Search events..."
//               value={search}
//               onChange={e => setSearch(e.target.value)}
//             />
//           </div>
//           <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
//             {categories.map(cat => (
//               <button
//                 key={cat}
//                 onClick={() => setCategory(cat)}
//                 style={{
//                   padding: '10px 18px',
//                   borderRadius: 10,
//                   border: '1px solid',
//                   borderColor: category === cat ? 'var(--accent)' : 'var(--border)',
//                   background: category === cat ? 'rgba(20,184,166,0.15)' : 'transparent',
//                   color: category === cat ? 'var(--accent)' : 'var(--text-muted)',
//                   cursor: 'pointer',
//                   fontSize: 13,
//                   fontWeight: 600,
//                   transition: 'all 0.2s',
//                 }}
//               >
//                 {cat}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Events Grid */}
//         {loading ? (
//           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
//             {[1,2,3,4,5,6].map(i => (
//               <div key={i} className="card" style={{ padding: 24, height: 300, background: 'var(--surface2)' }}>
//                 <div style={{ width: '100%', height: 160, background: 'var(--border)', borderRadius: 10, marginBottom: 16, animation: 'pulse 2s infinite' }} />
//                 <div style={{ width: '70%', height: 20, background: 'var(--border)', borderRadius: 4, marginBottom: 10 }} />
//                 <div style={{ width: '50%', height: 16, background: 'var(--border)', borderRadius: 4 }} />
//               </div>
//             ))}
//           </div>
//         ) : events.length === 0 ? (
//           <div style={{ textAlign: 'center', padding: '80px 20px' }}>
//             <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
//             <h3 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>No events found</h3>
//             <p style={{ color: 'var(--text-muted)' }}>Try a different search or check back later</p>
//           </div>
//         ) : (
//           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
//             {events.map((event, i) => (
//               <Link key={event._id} href={`/events/${event._id}`} style={{ textDecoration: 'none' }}>
//                 <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', animationDelay: `${i * 0.05}s` }}>
//                   {/* Image/Color banner */}
//                   <div style={{
//                     height: 180,
//                     background: event.imageUrl
//                       ? `url(${event.imageUrl}) center/cover`
//                       : `linear-gradient(135deg, ${
//                           event.category === 'Technical' ? '#14b8a6, #0d9488' :
//                           event.category === 'Cultural' ? '#f43f5e, #e11d48' :
//                           event.category === 'Sports' ? '#f59e0b, #d97706' :
//                           event.category === 'Workshop' ? '#a78bfa, #7c3aed' :
//                           '#60a5fa, #2563eb'
//                         })`,
//                     position: 'relative',
//                   }}>
//                     <div style={{ position: 'absolute', top: 12, left: 12 }}>
//                       <span className={`badge cat-${event.category}`}>{event.category}</span>
//                     </div>
//                     {getSpots(event) <= 10 && getSpots(event) > 0 && (
//                       <div style={{ position: 'absolute', top: 12, right: 12 }}>
//                         <span className="badge" style={{ background: 'rgba(244,63,94,0.2)', color: '#f43f5e' }}>
//                           {getSpots(event)} spots left!
//                         </span>
//                       </div>
//                     )}
//                     {getSpots(event) <= 0 && (
//                       <div style={{ position: 'absolute', top: 12, right: 12 }}>
//                         <span className="badge" style={{ background: 'rgba(107,114,128,0.3)', color: '#9ca3af' }}>FULL</span>
//                       </div>
//                     )}
//                   </div>

//                   <div style={{ padding: 20 }}>
//                     <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>{event.title}</h3>
//                     <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
//                       {event.description}
//                     </p>
//                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
//                         <Calendar size={14} style={{ color: 'var(--accent)' }} />
//                         {format(new Date(event.date), 'PPP')}
//                       </div>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
//                         <MapPin size={14} style={{ color: 'var(--accent)' }} />
//                         {event.venue}
//                       </div>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
//                         <Users size={14} style={{ color: 'var(--accent)' }} />
//                         {event.registeredCount}/{event.capacity} registered
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { Search, Calendar, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other']

interface Event {
  _id: string
  title: string
  description: string
  category: string
  date: string
  venue: string
  capacity: number
  registeredCount: number
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    fetchEvents()
  }, [search, category])

  async function fetchEvents() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category !== 'All') params.set('category', category)

    const res = await fetch(`/api/events?${params}`)
    const data = await res.json()
    setEvents(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const getSpots = (e: Event) => e.capacity - e.registeredCount

  return (
    <>
      <Navbar />
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              All Events
            </h1>
            <p className="text-gray-500">
              Browse and register for upcoming campus activities.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="relative flex-1 min-w-[250px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-md text-sm border transition ${
                    category === cat
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Events */}
          {loading ? (
            <div className="text-gray-500">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No events found.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <Link key={event._id} href={`/events/${event._id}`}>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition p-6 cursor-pointer">

                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                        {event.category}
                      </span>

                      {getSpots(event) <= 0 && (
                        <span className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full">
                          Full
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {event.title}
                    </h3>

                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-blue-600" />
                        {format(new Date(event.date), 'MMM d, yyyy')}
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-blue-600" />
                        {event.venue}
                      </div>

                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-blue-600" />
                        {event.registeredCount}/{event.capacity} registered
                      </div>
                    </div>

                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}