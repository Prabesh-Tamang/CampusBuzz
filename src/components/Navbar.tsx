'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Zap, LogOut, LayoutDashboard, ScanLine, Menu, X, Plus, Calendar, CreditCard, Bell } from 'lucide-react';

interface NavbarProps { showAdminLinks?: boolean; }

interface NotifEntry {
  _id: string;
  type: 'waitlist' | 'notify' | 'promoted';
  eventId: string;
  event: { title: string; date?: string; feeAmount?: number };
  position?: number;
  queueLength?: number;
}

export default function Navbar({ showAdminLinks = true }: NavbarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [notifEntries, setNotifEntries] = useState<NotifEntry[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);
  const isAdmin = session?.user?.role === 'admin';
  const sessionReady = status !== 'loading';
  const unreadCount = notifEntries.filter(e => !readIds.has(e._id)).length;

  useEffect(() => {
    if (!session || isAdmin) return;
    // Load dismissed IDs from localStorage
    try {
      const stored = localStorage.getItem('bell_dismissed');
      if (stored) setDismissedIds(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }

    Promise.all([
      fetch('/api/waitlist/my').then(r => r.json()).catch(() => ({ entries: [] })),
      fetch('/api/event-interest/my').then(r => r.json()).catch(() => ({ entries: [] })),
      fetch('/api/registrations').then(r => r.json()).catch(() => ({ registrations: [] })),
    ]).then(([wl, ni, regs]) => {
      // Get all registered event IDs to filter out waitlist entries for already-registered events
      const registeredEventIds = new Set(
        (regs.registrations || []).map((r: any) =>
          typeof r.eventId === 'object' ? String(r.eventId?._id) : String(r.eventId)
        )
      );

      const waitlistEventIds = new Set((wl.entries || []).map((e: any) => String(e.eventId)));

      // Promoted = has a registration with qrCode (confirmed) created in last 48h
      // AND the event was previously full (registeredCount >= capacity at some point)
      // Simplest signal: registration has qrCode set and was created recently (last 48h)
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const promoted: NotifEntry[] = (regs.registrations || [])
        .filter((r: any) => {
          const isRecent = new Date(r.createdAt).getTime() > cutoff;
          const hasQR = !!r.qrCode;
          const notOnWaitlist = !waitlistEventIds.has(
            typeof r.eventId === 'object' ? String(r.eventId?._id) : String(r.eventId)
          );
          // Only show as promoted if it came from waitlist promotion
          // Heuristic: no paymentId (free event) + has QR + recent + not currently on waitlist
          const isFreePromotion = !r.paymentId && hasQR && isRecent && notOnWaitlist;
          return isFreePromotion;
        })
        .map((r: any) => {
          const eid = typeof r.eventId === 'object' ? String(r.eventId?._id) : String(r.eventId);
          return {
            _id: `promoted-${r._id}`,
            type: 'promoted' as const,
            eventId: eid,
            event: typeof r.eventId === 'object' ? r.eventId : { title: 'Event' },
          };
        });

      const waitlist: NotifEntry[] = (wl.entries || []).map((e: any) => ({
        _id: String(e._id), type: 'waitlist' as const,
        eventId: String(e.eventId), event: e.event || {},
        position: e.position, queueLength: e.queueLength,
      }));
      const notify: NotifEntry[] = (ni.entries || []).map((e: any) => ({
        _id: String(e._id), type: 'notify' as const,
        eventId: String(e.eventId), event: e.event || {},
      }));

      // Promoted entries go first (most important)
      const all = [...promoted, ...waitlist, ...notify];
      // Filter out dismissed entries
      const stored = (() => { try { return new Set(JSON.parse(localStorage.getItem('bell_dismissed') || '[]')); } catch { return new Set(); } })();
      setNotifEntries(all.filter((e: NotifEntry) => !stored.has(e._id)));
    });
  }, [session, isAdmin]);

  useEffect(() => {
    if (!showBell) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
    };
    // Delay adding listener so the bell button click doesn't immediately trigger it
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [showBell]);

  const openBell = () => {
    const next = !showBell;
    setShowBell(next);
    if (next) setReadIds(new Set(notifEntries.map(e => e._id)));
  };

  const goToEvent = (eventId: string) => {
    router.push(`/events/${eventId}`);
    setTimeout(() => setShowBell(false), 50);
  };

  const handleLogout = () => signOut({ callbackUrl: '/' });

  const nl = (href: string, icon: React.ReactNode, label: string) => (
    <Link key={href} href={href} className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg hover:text-white hover:bg-white/5 transition-all flex items-center gap-2">
      {icon}{label}
    </Link>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#050d0c]/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between h-[68px]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 no-underline flex-shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-teal-950 fill-teal-950" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Campus<span className="text-teal-400">Buzz</span>
              </span>
            </Link>

            {/* Desktop */}
            <div className="hidden md:flex items-center gap-1">
              {sessionReady && isAdmin && showAdminLinks && (
                <>
                  <Link href="/admin/events/new" className="px-4 py-2 text-sm font-semibold bg-teal-500 text-[#042f2e] rounded-lg hover:bg-teal-400 transition flex items-center gap-2">
                    <Plus size={15} /> New Event
                  </Link>
                  {nl('/admin/events', <Calendar size={15} />, 'Events')}
                  {nl('/admin/scanner', <ScanLine size={15} />, 'Scanner')}
                  {nl('/admin/dashboard', <LayoutDashboard size={15} />, 'Dashboard')}
                  {nl('/admin/payments', <CreditCard size={15} />, 'Payments')}
                </>
              )}
              {sessionReady && !isAdmin && session && (
                <>
                  {nl('/my-events', <Calendar size={15} />, 'My Events')}
                  {nl('/my-payments', <CreditCard size={15} />, 'My Payments')}
                </>
              )}

              {sessionReady && session ? (
                <div className="flex items-center gap-2 ml-2">

                  {/* Bell */}
                  {!isAdmin && (
                    <div className="relative" ref={bellRef}>
                      <button onClick={openBell} className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all" aria-label="Notifications">
                        <Bell size={19} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-teal-500 text-[#042f2e] text-[9px] font-bold rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {showBell && (
                        <div className="absolute right-0 top-[calc(100%+8px)] rounded-2xl shadow-2xl z-[9999]" style={{ width: '400px', background: '#0c1628', border: '1px solid #1e293b' }}>
                          {/* Header */}
                          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1e293b' }}>
                            <div>
                              <p className="text-sm font-bold text-white">Activity</p>
                              <p className="text-xs mt-0.5 text-gray-500">
                                {notifEntries.length === 0 ? 'Nothing active' : `${notifEntries.length} item${notifEntries.length !== 1 ? 's' : ''}`}
                              </p>
                            </div>
                            {notifEntries.length > 0 && (
                              <button onClick={() => {
                                const ids = notifEntries.map(e => e._id);
                                const newDismissed = new Set([...dismissedIds, ...ids]);
                                setDismissedIds(newDismissed);
                                try { localStorage.setItem('bell_dismissed', JSON.stringify([...newDismissed])); } catch { /* ignore */ }
                                setNotifEntries([]);
                              }} className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-colors" style={{ background: '#1e293b' }}>
                                Clear all
                              </button>
                            )}
                          </div>

                          {/* Items */}
                          {notifEntries.length === 0 ? (
                            <div className="px-5 py-10 text-center">
                              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#1e293b' }}>
                                <Bell size={20} className="text-gray-600" />
                              </div>
                              <p className="text-sm font-semibold text-gray-400">All caught up!</p>
                              <p className="text-xs mt-1 text-gray-600">No active waitlists or notifications</p>
                            </div>
                          ) : (
                            <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                              {notifEntries.map((entry, idx) => (
                                <button
                                  key={entry._id}
                                  onClick={() => goToEvent(entry.eventId)}
                                  className="w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                                  style={{ borderBottom: idx < notifEntries.length - 1 ? '1px solid #1e293b' : 'none', background: readIds.has(entry._id) ? 'transparent' : entry.type === 'promoted' ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)' }}
                                >
                                  <div className="flex-shrink-0 flex items-center justify-center rounded-xl text-lg" style={{ width: 40, height: 40, background: entry.type === 'waitlist' ? 'rgba(245,158,11,0.12)' : entry.type === 'promoted' ? 'rgba(20,184,166,0.15)' : 'rgba(168,85,247,0.12)' }}>
                                    {entry.type === 'waitlist' ? '⏳' : entry.type === 'promoted' ? '🎉' : '🔔'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white leading-snug">{entry.event?.title || 'Event'}</p>
                                    {entry.type === 'waitlist' ? (
                                      <p className="text-xs mt-1 text-amber-400">#{entry.position} in queue · {entry.queueLength} waiting</p>
                                    ) : entry.type === 'promoted' ? (
                                      <p className="text-xs mt-1 font-semibold" style={{ color: '#14b8a6' }}>🎉 You've been promoted! Tap to view your ticket.</p>
                                    ) : (
                                      <p className="text-xs mt-1 text-purple-400">Notify Me · Rs. {entry.event?.feeAmount}</p>
                                    )}
                                    {entry.event?.date && (
                                      <p className="text-xs mt-0.5 text-gray-500">
                                        {new Date(entry.event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    )}
                                  </div>
                                  {!readIds.has(entry._id) && (
                                    <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Footer */}
                          <div style={{ borderTop: '1px solid #1e293b' }}>
                            <button onClick={() => { router.push('/my-events'); setTimeout(() => setShowBell(false), 50); }} className="w-full py-3 text-xs font-semibold text-teal-400 hover:bg-white/5 transition-colors">
                              View My Events →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* User chip */}
                  <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-xs font-bold text-teal-950">
                      {session.user?.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-white">{session.user?.name?.split(' ')[0]}</span>
                    {isAdmin && <span className="text-[10px] font-bold text-teal-400 bg-teal-400/10 px-1.5 py-[2px] rounded border border-teal-400/20">ADMIN</span>}
                  </div>

                  <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-1 px-3 py-2 text-sm btn-ghost">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              ) : sessionReady ? (
                <div className="flex gap-2 ml-3">
                  <Link href="/auth/login"><button className="px-5 py-2 text-sm btn-ghost">Login</button></Link>
                  <Link href="/auth/signup"><button className="px-5 py-2 text-sm btn-primary">Sign Up</button></Link>
                </div>
              ) : null}
            </div>

            {/* Mobile */}
            <div className="md:hidden flex items-center gap-1">
              {sessionReady && session && !isAdmin && (
                <div className="relative" ref={bellRef}>
                  <button onClick={openBell} className="relative p-2 text-gray-400 hover:text-white">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-teal-500 text-[#042f2e] text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {showBell && (
                    <div className="absolute right-0 top-[calc(100%+8px)] rounded-2xl shadow-2xl z-[9999]" style={{ width: '320px', background: '#0c1628', border: '1px solid #1e293b' }}>
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e293b' }}>
                        <p className="text-sm font-bold text-white">Activity</p>
                      </div>
                      {notifEntries.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">No active notifications</div>
                      ) : (
                        <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                          {notifEntries.map((entry, idx) => (
                            <button
                              key={entry._id}
                              onClick={() => goToEvent(entry.eventId)}
                              className="w-full text-left flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                              style={{ borderBottom: idx < notifEntries.length - 1 ? '1px solid #1e293b' : 'none' }}
                            >
                              <span className="text-base">{entry.type === 'waitlist' ? '⏳' : '🔔'}</span>
                              <div>
                                <p className="text-sm font-semibold text-white">{entry.event?.title}</p>
                                <p className={`text-xs mt-0.5 ${entry.type === 'waitlist' ? 'text-amber-400' : 'text-purple-400'}`}>
                                  {entry.type === 'waitlist' ? `#${entry.position} in queue` : 'Notify Me active'}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 text-gray-400 hover:text-white">
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {showMobileMenu && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-1">
                {sessionReady && isAdmin && showAdminLinks && (
                  <>
                    <Link href="/admin/events/new" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-teal-400 rounded-lg">+ New Event</Link>
                    <Link href="/admin/events" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-400 rounded-lg">Events</Link>
                    <Link href="/admin/scanner" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-400 rounded-lg">Scanner</Link>
                    <Link href="/admin/dashboard" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-400 rounded-lg">Dashboard</Link>
                    <Link href="/admin/payments" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-400 rounded-lg">Payments</Link>
                  </>
                )}
                {sessionReady && !isAdmin && session && (
                  <>
                    <Link href="/my-events" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-400 rounded-lg">My Events</Link>
                    <Link href="/my-payments" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-400 rounded-lg">My Payments</Link>
                  </>
                )}
                {sessionReady && session && (
                  <button onClick={() => setShowLogoutConfirm(true)} className="px-4 py-2.5 text-sm font-semibold text-left text-gray-400 rounded-lg">Sign Out</button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Logout modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-8 max-w-sm mx-4 text-center">
            <h3 className="text-xl font-bold text-white mb-3">Sign Out?</h3>
            <p className="text-muted-foreground mb-6">Are you sure you want to sign out?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-ghost px-6">Cancel</button>
              <button onClick={handleLogout} className="btn-primary px-6">Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
