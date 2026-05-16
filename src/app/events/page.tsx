'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Search, X, Calendar, MapPin, Users, DollarSign, Ticket, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { EventCardSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { CalendarX } from 'lucide-react'
import { EVENT_CATEGORIES, PAGINATION } from '@/lib/constants'
import TitleSetter from '@/components/TitleSetter'

interface Event {
  _id: string
  title: string
  description: string
  category: string
  date: string
  venue: string
  capacity: number
  registeredCount: number
  feeType: 'free' | 'paid'
  feeAmount: number
  imageUrl?: string
}

interface Registration {
  _id: string
  eventId: Event
  registrationId: string
  checkedIn: boolean
  createdAt: string
}

interface Recommendation {
  event: Event
  score: number
  reason: string
}

function EventsContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const isGuest = !session

  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? 'All'
  const statusFilter = searchParams.get('status') ?? 'upcoming'
  const feeFilter = searchParams.get('fee') ?? 'all'

  const [events, setEvents] = useState<Event[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [totalEvents, setTotalEvents] = useState(0)
  const [searchInput, setSearchInput] = useState(search)

  const updateFilters = useCallback((newSearch: string, newCategory: string, newStatus: string, newFee: string) => {
    const params = new URLSearchParams()
    if (newSearch) params.set('search', newSearch)
    if (newCategory && newCategory !== 'All') params.set('category', newCategory)
    if (newStatus && newStatus !== 'upcoming') params.set('status', newStatus)
    if (newFee && newFee !== 'all') params.set('fee', newFee)
    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }, [router, pathname])

  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters(searchInput, category, statusFilter, feeFilter)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchEvents()
    if (session) {
      fetch('/api/recommendations')
        .then(r => r.json())
        .then(d => {
          if (d.recommendations) setRecommendations(d.recommendations)
        })
        .catch(() => {})
      fetchRegistrations()
    }
  }, [session, search, category, statusFilter, feeFilter])

  async function fetchRegistrations() {
    try {
      const res = await fetch('/api/registrations')
      const data = await res.json()
      if (data.registrations && Array.isArray(data.registrations)) {
        setRegistrations(data.registrations)
      }
    } catch {}
  }

  async function fetchEvents() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category !== 'All') params.set('category', category)
    if (statusFilter === 'ended') params.set('status', 'ended')
    if (feeFilter !== 'all') params.set('fee', feeFilter)

    const res = await fetch(`/api/events?${params}`)
    const data = await res.json()
    const allEvents: Event[] = Array.isArray(data) ? data : []
    setTotalEvents(allEvents.length)

    let filtered = allEvents

    if (feeFilter === 'free') {
      filtered = filtered.filter(e => e.feeType === 'free')
    } else if (feeFilter === 'paid') {
      filtered = filtered.filter(e => e.feeType === 'paid')
    }

    const now = new Date()

    if (statusFilter !== 'ended') {
      filtered = filtered
        .filter(e => new Date(e.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    if (isGuest) {
      filtered = filtered.slice(0, PAGINATION.LANDING_EVENTS_GUEST)
    }

    setEvents(filtered)
    setLoading(false)
  }

  const getSpots = (e: Event) => e.capacity - e.registeredCount

  return (
    <div className="min-h-screen">
      <TitleSetter title={isGuest ? 'Discover Events' : 'Events'} />
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-[clamp(32px,5vw,48px)] font-extrabold tracking-tighter text-white mb-3">
                {isGuest ? 'Discover Events' : 'All Events'}
              </h1>
              <p className="text-muted-foreground">
                {isGuest
                  ? 'Browse upcoming campus activities. Sign up to see more.'
                  : 'Browse and register for upcoming campus activities.'
                }
              </p>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => updateFilters(search, category, 'upcoming', feeFilter)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border ${
                  statusFilter === 'upcoming'
                    ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                    : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.06] hover:text-gray-200'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => updateFilters(search, category, 'ended', feeFilter)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border ${
                  statusFilter === 'ended'
                    ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                    : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.06] hover:text-gray-200'
                }`}
              >
                Past Events
              </button>
            </div>

            {/* Search bar */}
            <div className="relative max-w-md mb-4">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search events..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10
                           rounded-xl text-white text-sm placeholder-gray-500
                           focus:outline-none focus:border-teal-500/40 focus:bg-white/[0.06]
                           transition-all"
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); updateFilters('', category, statusFilter, feeFilter) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500
                             hover:text-gray-300 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap mb-6">
              {['All', ...EVENT_CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => updateFilters(search, cat, statusFilter, feeFilter)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                              duration-150 border ${
                    category === cat
                      ? 'bg-teal-500/20 text-teal-400 border-teal-500/30 shadow-sm shadow-teal-500/10'
                      : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.06] hover:text-gray-200 hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Fee Filter */}
            <div className="flex gap-2 flex-wrap mb-8">
              {(['all', 'free', 'paid'] as const).map((fee) => (
                <button
                  key={fee}
                  onClick={() => updateFilters(search, category, statusFilter, fee)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                              duration-150 border ${
                    feeFilter === fee
                      ? fee === 'free'
                        ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                        : fee === 'paid'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-white/[0.06] text-white border-white/20'
                      : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.06] hover:text-gray-200'
                  }`}
                >
                  {fee === 'all' ? 'All Fees' : fee === 'free' ? 'Free' : 'Paid'}
                </button>
              ))}
            </div>

            {/* Recommendations grid */}
            {session && (session.user as { role?: string })?.role !== 'admin' && recommendations.length > 0 && statusFilter === 'upcoming' && (
              <section className="mb-8">
                <h2 className="text-sm font-medium text-teal-400 uppercase tracking-wider mb-4">
                  Recommended for you
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {recommendations.slice(0, 3).map(({ event: recEvent, reason }) => (
                    <div key={recEvent._id} className="relative group">
                      <Link
                        href={`/events/${recEvent._id}`}
                        className="card p-5 cursor-pointer block"
                      >
                        <div className="mb-3">
                          <span className={`badge cat-${recEvent.category}`}>
                            {recEvent.category}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mb-3 line-clamp-2">
                          {recEvent.title}
                        </h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-accent" />
                            {format(new Date(recEvent.date), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-accent" />
                            {recEvent.venue}
                          </div>
                        </div>
                      </Link>
                      <div className="absolute top-3 right-3 z-10">
                        <span className="text-xs bg-teal-500/20 text-teal-300 border
                                         border-teal-500/30 px-2 py-0.5 rounded-full">
                          ✨ For you
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3 opacity-0
                                      group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-gray-300 bg-black/70 backdrop-blur-sm
                                      px-3 py-1.5 rounded-lg">
                          {reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Events Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                icon={CalendarX}
                title="No events found"
                description={
                  search || category !== 'All'
                    ? 'No events match your search. Try a different term or category.'
                    : 'No upcoming events at the moment. Check back soon.'
                }
                actionLabel={search || category !== 'All' ? 'Clear filters' : undefined}
                onAction={() => { setSearchInput(''); updateFilters('', 'All', statusFilter, 'all') }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map(event => (
                  <Link key={event._id} href={`/events/${event._id}`} className="flex">
                    <div className="card p-0 cursor-pointer overflow-hidden group flex flex-col w-full">
                      {/* Header Banner or Image */}
                      {event.imageUrl ? (
                        <div className="h-40 overflow-hidden flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).parentElement!.style.display = 'none'
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="h-36 relative flex-shrink-0"
                          style={{
                            background: event.category === 'Technical' ? 'linear-gradient(135deg, #14b8a6, #0d9488)' :
                                       event.category === 'Cultural' ? 'linear-gradient(135deg, #f43f5e, #e11d48)' :
                                       event.category === 'Sports' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                       event.category === 'Workshop' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' :
                                       event.category === 'Seminar' ? 'linear-gradient(135deg, #fb923c, #ea580c)' :
                                       event.category === 'Hackathon' ? 'linear-gradient(135deg, #ec4899, #db2777)' :
                                       'linear-gradient(135deg, #60a5fa, #2563eb)'
                          }}
                        >
                          <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                            <span className="badge bg-white/20 text-white backdrop-blur-sm">
                              {event.category}
                            </span>
                            {event.feeType === 'paid' ? (
                              <span className="badge bg-amber-500/40 text-amber-300 backdrop-blur-sm">
                                Rs. {event.feeAmount}
                              </span>
                            ) : (
                              <span className="badge bg-green-500/40 text-green-300 backdrop-blur-sm">
                                Free
                              </span>
                            )}
                          </div>
                          <div className="absolute top-3 right-3 flex gap-2 flex-wrap">
                            {getSpots(event) <= 0 && (
                              <span className="badge bg-gray-500/20 text-gray-300 backdrop-blur-sm">FULL</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent transition-colors line-clamp-2">
                          {event.title}
                        </h3>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                          {event.description}
                        </p>

                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-accent flex-shrink-0" />
                            <span className="truncate">{format(new Date(event.date), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-accent flex-shrink-0" />
                            <span className="truncate">{event.venue}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-accent flex-shrink-0" />
                            <span>{event.registeredCount}/{event.capacity} registered</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                getSpots(event) <= 0 ? 'bg-red-500' :
                                (event.registeredCount / event.capacity) > 0.8 ? 'bg-amber-500' : 'bg-accent'
                              }`}
                              style={{ width: `${Math.min((event.registeredCount / event.capacity) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Guest CTA */}
            {isGuest && totalEvents > PAGINATION.LANDING_EVENTS_GUEST && (
              <div className="text-center py-12 border-t border-white/5 mt-8">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {totalEvents - PAGINATION.LANDING_EVENTS_GUEST}+ more events waiting
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Sign up to see all events, get personalised recommendations,
                  and register in seconds.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/auth/signup"
                    className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white
                               text-sm font-medium rounded-xl transition-colors">
                    Create free account
                  </Link>
                  <Link href="/auth/login"
                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300
                               text-sm font-medium rounded-xl border border-white/10 transition-colors">
                    Sign in
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - User Registration History */}
          {session && (session.user as { role?: string })?.role !== 'admin' && (
            <aside className="w-full lg:w-80 flex-shrink-0">
              <div className="card p-5 sticky top-24">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Ticket size={18} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">My Registrations</h3>
                      <p className="text-xs text-muted-foreground">{registrations.length} events</p>
                    </div>
                  </div>
                </div>

                {registrations.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket size={32} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No registrations yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Browse events to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {registrations.slice(0, 10).map(reg => (
                      <Link
                        key={reg._id}
                        href={`/events/${reg.eventId?._id}`}
                        className="block p-3 bg-surface2 rounded-lg hover:bg-dark-border transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-accent transition-colors">
                              {reg.eventId?.title || 'Event'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                reg.checkedIn
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {reg.checkedIn ? 'Checked In' : 'Registered'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(reg.eventId?.date || reg.createdAt), 'MMM d')}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-muted-foreground mt-1 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}

                    {registrations.length > 10 && (
                      <Link
                        href="/my-registrations"
                        className="block text-center py-2 text-sm text-accent hover:text-accent/80 transition-colors"
                      >
                        View all {registrations.length} registrations
                      </Link>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border">
                  <Link
                    href="/my-payments"
                    className="flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-white transition-colors"
                  >
                    <DollarSign size={14} />
                    View Payment History
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>

      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EventsContent />
    </Suspense>
  )
}
