'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import { Calendar, MapPin, Users, Clock, ArrowLeft, Ticket, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  endDate: string;
  venue: string;
  capacity: number;
  registeredCount: number;
  organizer: string;
  imageUrl: string;
  tags: string[];
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [registrationId, setRegistrationId] = useState('');

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then(r => r.json())
      .then(data => { setEvent(data); setLoading(false); });
  }, [id]);

  async function handleRegister() {
    if (!session) { router.push('/auth/login'); return; }
    setRegistering(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRegistered(true);
      setQrCode(data.qrCode);
      setRegistrationId(data.registration.registrationId);
      toast.success('🎉 Registered! Check your email for QR code.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  }

  if (loading) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '60px auto', padding: '0 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  );

  if (!event) return <div><Navbar /><div style={{ padding: 60, textAlign: 'center' }}>Event not found</div></div>;

  const spotsLeft = event.capacity - event.registeredCount;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <Link href="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 32, fontSize: 14, fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Events
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
          {/* Main Content */}
          <div>
            {/* Banner */}
            <div style={{
              height: 280,
              borderRadius: 20,
              marginBottom: 32,
              background: event.imageUrl
                ? `url(${event.imageUrl}) center/cover`
                : `linear-gradient(135deg, ${
                    event.category === 'Technical' ? '#14b8a6, #0d9488' :
                    event.category === 'Cultural' ? '#f43f5e, #e11d48' :
                    event.category === 'Sports' ? '#f59e0b, #d97706' :
                    '#a78bfa, #7c3aed'
                  })`,
              display: 'flex',
              alignItems: 'flex-end',
              padding: 24,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <span className={`badge cat-${event.category}`} style={{ fontSize: 13 }}>{event.category}</span>
            </div>

            <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{event.title}</h1>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 32 }}>
              {[
                { icon: Calendar, text: format(new Date(event.date), 'PPP') },
                { icon: Clock, text: `${format(new Date(event.date), 'p')} – ${format(new Date(event.endDate), 'p')}` },
                { icon: MapPin, text: event.venue },
                { icon: Users, text: `${event.registeredCount}/${event.capacity} registered` },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
                  <item.icon size={16} style={{ color: 'var(--accent)' }} />
                  {item.text}
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>About this Event</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{event.description}</p>
            </div>

            {event.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {event.tags.map(tag => (
                  <span key={tag} style={{ padding: '6px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 84 }}>
            {/* Registration Card */}
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              {registered ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, background: 'rgba(20,184,166,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle size={28} color="var(--accent)" />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--accent)' }}>You're In! 🎉</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
                    Registration ID: <strong style={{ color: 'var(--text)', fontFamily: 'Space Mono, monospace', fontSize: 12 }}>{registrationId}</strong>
                  </p>
                  {qrCode && (
                    <div style={{ background: 'white', borderRadius: 12, padding: 16, display: 'inline-block' }}>
                      <img src={qrCode} alt="QR Code" style={{ width: 160, height: 160 }} />
                    </div>
                  )}
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>Show this QR at entry. Also sent to your email.</p>
                </div>
              ) : (
                <>
                  {/* Capacity bar */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Capacity</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{spotsLeft} spots left</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(event.registeredCount / event.capacity) * 100}%`,
                        background: spotsLeft < 20 ? '#f43f5e' : 'var(--accent)',
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, fontSize: 14, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Organizer</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{event.organizer}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Date</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{format(new Date(event.date), 'MMM d, yyyy')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Entry</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>FREE</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRegister}
                    disabled={registering || spotsLeft <= 0}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      fontSize: 16,
                      padding: '14px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: spotsLeft <= 0 ? 0.5 : 1,
                    }}
                  >
                    {registering ? 'Registering...' : spotsLeft <= 0 ? 'Event Full' : (
                      <><Ticket size={18} /> Register Now</>
                    )}
                  </button>

                  {!session && (
                    <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                      <Link href="/auth/login" style={{ color: 'var(--accent)' }}>Login</Link> to register
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Organizer card */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organized by</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #14b8a6, #0d9488)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#042f2e' }}>
                  {event.organizer[0]}
                </div>
                <span style={{ fontWeight: 600 }}>{event.organizer}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
