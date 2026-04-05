"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import PaymentModal from "@/components/PaymentModal";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  Ticket,
  CheckCircle,
  Clock3,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

interface EventData {
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
  feeType: 'free' | 'paid';
  feeAmount: number;
  registrationDeadline?: string;
  isCancelled: boolean;
  cancelReason?: string;
}

interface Registration {
  _id: string;
  eventId: string;
  registrationId: string;
}

interface WaitlistStatus {
  position: number;
  queueLength: number;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [waitlisted, setWaitlisted] = useState(false);
  const [waitlistInfo, setWaitlistInfo] = useState<WaitlistStatus | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [interested, setInterested] = useState(false); // paid event "Notify Me"

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data);
        setLoading(false);
      });

    if (session) {
      fetch('/api/registrations')
        .then((r) => r.json())
        .then((data) => {
          const regs = data.registrations || [];
          // eventId may be a populated object or a string
          const hasReg = regs.some((reg: any) => {
            const eid = typeof reg.eventId === 'object' ? reg.eventId?._id?.toString() : reg.eventId?.toString();
            return eid === id?.toString();
          });
          if (hasReg) {
            setRegistered(true);
            // Find the registration to get QR code
            const existingReg = regs.find((reg: any) => {
              const eid = typeof reg.eventId === 'object' ? reg.eventId?._id?.toString() : reg.eventId?.toString();
              return eid === id?.toString();
            });
            if (existingReg?.qrCode) setQrCode(existingReg.qrCode);
            if (existingReg?.registrationId) setRegistrationId(existingReg.registrationId);
          }
        });

      fetch(`/api/waitlist?eventId=${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.error && data.position) {
            setWaitlisted(true);
            setWaitlistInfo({ position: data.position, queueLength: data.queueLength });
          }
        })
        .catch(() => {});

      // Check paid event interest
      fetch(`/api/event-interest?eventId=${id}`)
        .then((r) => r.json())
        .then((data) => { if (data.interested) setInterested(true); })
        .catch(() => {});
    }
  }, [id, session]);

  async function handleRegister() {
    if (!session) {
      router.push("/auth/login");
      return;
    }
    
    if (event?.feeType === 'paid' && event?.feeAmount > 0) {
      setShowPayment(true);
      return;
    }
    
    setRegistering(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRegistered(true);
      setQrCode(data.qrCode);
      setRegistrationId(data.registration.registrationId);
      toast.success("Registered! Check your email for QR code.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }

  async function handleJoinWaitlist() {
    if (!session) {
      router.push("/auth/login");
      return;
    }
    setRegistering(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWaitlisted(true);
      setWaitlistInfo({ position: data.position, queueLength: data.queueLength });
      toast.success(`You're #${data.position} on the waitlist!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join waitlist");
    } finally {
      setRegistering(false);
    }
  }

  async function handleLeaveWaitlist() {
    if (!session) return;
    try {
      const res = await fetch("/api/waitlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setWaitlisted(false);
      setWaitlistInfo(null);
      toast.success("Left the waitlist");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to leave waitlist");
    }
  }

  function handlePaymentSuccess() {
    setShowPayment(false);
    setRegistered(true);
    toast.success("Payment successful! Check your email for QR code.");
  }

  async function handleNotifyMe() {
    if (!session) { router.push("/auth/login"); return; }
    setRegistering(true);
    try {
      const res = await fetch("/api/event-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInterested(true);
      toast.success("We'll notify you when spots open up!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setRegistering(false);
    }
  }

  async function handleRemoveInterest() {
    if (!session) return;
    try {
      await fetch("/api/event-interest", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      setInterested(false);
      toast.success("Removed from notify list");
    } catch { /* silent */ }
  }

  if (loading)
    return (
      <div>
        <Navbar />
        <div
          style={{
            maxWidth: 900,
            margin: "60px auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      </div>
    );

  if (!event)
    return (
      <div>
        <Navbar />
        <div style={{ padding: 60, textAlign: "center" }}>Event not found</div>
      </div>
    );

  const spotsLeft = event.capacity - event.registeredCount;
  const now = new Date();
  const eventDate = new Date(event.date);
  const eventEndDate = new Date(event.endDate || event.date);
  const deadlineDate = event.registrationDeadline ? new Date(event.registrationDeadline) : null;

  const isCancelled = event.isCancelled;
  const isEnded = now > eventEndDate;
  const isHappening = now >= eventDate && now <= eventEndDate;
  const deadlinePassed = deadlineDate && now > deadlineDate;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <Link
          href="/events"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginBottom: 32,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Events
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 32,
            alignItems: "start",
          }}
        >
          {/* Main Content */}
          <div>
            {/* Banner */}
            <div
              style={{
                height: 280,
                borderRadius: 20,
                marginBottom: 32,
                background: event.imageUrl
                  ? `url(${event.imageUrl}) center/cover`
                  : `linear-gradient(135deg, ${
                      event.category === "Technical"
                        ? "#14b8a6, #0d9488"
                        : event.category === "Cultural"
                          ? "#f43f5e, #e11d48"
                          : event.category === "Sports"
                            ? "#f59e0b, #d97706"
                            : "#a78bfa, #7c3aed"
                    })`,
                display: "flex",
                alignItems: "flex-end",
                padding: 24,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                className={`badge cat-${event.category}`}
                style={{ fontSize: 13 }}
              >
                {event.category}
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(28px, 5vw, 44px)",
                fontWeight: 800,
                margin: "0 0 16px",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {event.title}
            </h1>

            <div
              style={{
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
                marginBottom: 32,
              }}
            >
              {[
                { icon: Calendar, text: format(new Date(event.date), "PPP") },
                {
                  icon: Clock,
                  text: event.endDate
                    ? `${format(new Date(event.date), "p")} – ${format(new Date(event.endDate), "p")}`
                    : format(new Date(event.date), "p"),
                },
                // { icon: Clock, text: `${format(new Date(event.date), 'p')} – ${format(new Date(event.endDate), 'p')}` },
                { icon: MapPin, text: event.venue },
                {
                  icon: Users,
                  text: `${event.registeredCount}/${event.capacity} registered`,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--text-muted)",
                    fontSize: 14,
                  }}
                >
                  <item.icon size={16} style={{ color: "var(--accent)" }} />
                  {item.text}
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>
                About this Event
              </h3>
              <p
                style={{
                  color: "var(--text-muted)",
                  lineHeight: 1.8,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {event.description}
              </p>
            </div>

            {event.tags?.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "6px 12px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ position: "sticky", top: 84 }}>
            {/* Registration Card */}
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              {isCancelled ? (
                <div style={{ padding: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, textAlign: 'center' }}>
                  <h3 style={{ color: '#ef4444', fontWeight: 700, margin: '0 0 8px', fontSize: 18 }}>Event Cancelled</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>{event.cancelReason || 'No reason provided'}</p>
                </div>
              ) : isEnded ? (
                <div style={{ padding: 20, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: 12, textAlign: 'center' }}>
                  <h3 style={{ color: '#94a3b8', fontWeight: 700, margin: '0 0 8px', fontSize: 18 }}>Event Ended</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Ended on {format(eventEndDate, 'MMM d, yyyy')}</p>
                </div>
              ) : isHappening ? (
                <div style={{ padding: 20, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, textAlign: 'center' }}>
                  <h3 style={{ color: '#3b82f6', fontWeight: 700, margin: 0, fontSize: 18 }}>Event is happening now</h3>
                </div>
              ) : deadlinePassed && !registered && !waitlisted ? (
                <div style={{ padding: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, textAlign: 'center' }}>
                  <h3 style={{ color: '#f59e0b', fontWeight: 700, margin: '0 0 8px', fontSize: 18 }}>Registration Closed</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Closed on {format(deadlineDate!, 'MMM d, yyyy')}</p>
                </div>
              ) : registered ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, background: "rgba(20,184,166,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <CheckCircle size={28} color="var(--accent)" />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "var(--accent)" }}>
                    You're Registered! 🎉
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px" }}>
                    Registration ID:{" "}
                    <strong style={{ color: "var(--text)", fontFamily: "monospace", fontSize: 12 }}>
                      {registrationId}
                    </strong>
                  </p>
                  {qrCode ? (
                    <>
                      <Link 
                        href={`/my-events/checkin/${registrationId}`}
                        className="btn-primary" 
                        style={{ width: '100%', fontSize: 15, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}
                      >
                        <Ticket size={18} /> View my QR →
                      </Link>
                    </>
                  ) : (
                    <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: 16, marginTop: 8 }}>
                      <p style={{ color: "#f59e0b", fontSize: 13, margin: 0 }}>
                        ⏰ QR code will be available after you confirm attendance 24h before the event.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Capacity bar */}
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        Capacity
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {spotsLeft} spots left
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "var(--border)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(event.registeredCount / event.capacity) * 100}%`,
                          background:
                            spotsLeft < 20 ? "#f43f5e" : "var(--accent)",
                          borderRadius: 3,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginBottom: 20,
                      fontSize: 14,
                      color: "var(--text-muted)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Organizer</span>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>
                        {event.organizer}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Date</span>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Entry</span>
                      <span style={{ 
                        color: event.feeType === 'paid' ? "#f59e0b" : "var(--accent)", 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        {event.feeType === 'paid' ? (
                          <>
                            <CreditCard size={14} /> Rs. {event.feeAmount}
                          </>
                        ) : (
                          'FREE'
                        )}
                      </span>
                    </div>
                  </div>

                  {event.feeType === 'paid' && spotsLeft <= 0 ? (
                    // PAID + FULL → Notify Me / Sold Out
                    interested ? (
                      <div style={{ textAlign: 'center' }}>
                         <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, marginBottom: 16 }}>
                          <h3 style={{ color: '#ef4444', fontWeight: 700, margin: 0, fontSize: 16 }}>Sold out</h3>
                        </div>
                        <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                          🔔 You'll be notified when spots open
                        </div>
                        <button onClick={handleRemoveInterest} className="btn-ghost" style={{ width: '100%', fontSize: 13 }}>
                          Remove notification
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, textAlign: 'center', marginBottom: 12 }}>
                          <h3 style={{ color: '#ef4444', fontWeight: 700, margin: 0, fontSize: 16 }}>Sold out</h3>
                        </div>
                        <button
                          onClick={handleNotifyMe}
                          disabled={registering}
                          className="btn-secondary"
                          style={{ width: '100%', fontSize: 16, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                          🔔 {registering ? 'Saving...' : 'Notify Me When Available'}
                        </button>
                      </>
                    )

                  ) : event.feeType === 'free' && spotsLeft <= 0 ? (
                    // FREE + FULL → Waitlist
                    waitlisted && waitlistInfo ? (
                      <div style={{ textAlign: 'center', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f59e0b', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
                           #{waitlistInfo.position} in line
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 16px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{waitlistInfo.queueLength} students waiting</span>
                        </p>
                        <button onClick={handleLeaveWaitlist} className="btn-ghost" style={{ width: '100%', fontSize: 14, padding: '10px' }}>
                          Leave waitlist
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, textAlign: 'center', marginBottom: 12 }}>
                          <h3 style={{ color: '#ef4444', fontWeight: 700, margin: 0, fontSize: 16 }}>Sold out</h3>
                        </div>
                        <button
                          onClick={handleJoinWaitlist}
                          disabled={registering}
                          className="btn-secondary"
                          style={{ width: '100%', fontSize: 16, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                          <Clock3 size={18} /> {registering ? 'Joining...' : 'Join Waitlist'}
                        </button>
                      </>
                    )

                  ) : (
                    // SPOTS AVAILABLE → Register / Buy Ticket
                    <button
                      onClick={handleRegister}
                      disabled={registering}
                      className="btn-primary"
                      style={{ width: '100%', fontSize: 16, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {registering ? 'Processing...' : event.feeType === 'paid' ? <><CreditCard size={18} /> Buy Rs.{event.feeAmount}</> : <><Ticket size={18} /> Register Free</>}
                    </button>
                  )}

                  {!session && (
                    <p
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 12,
                      }}
                    >
                      <Link
                        href="/auth/login"
                        style={{ color: "var(--accent)" }}
                      >
                        Login
                      </Link>{" "}
                      to register
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Organizer card */}
            <div className="card" style={{ padding: 20 }}>
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "0 0 12px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Organized by
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: "linear-gradient(135deg, #14b8a6, #0d9488)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#042f2e",
                  }}
                >
                  {event.organizer[0]}
                </div>
                <span style={{ fontWeight: 600 }}>{event.organizer}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations Strip */}
        <RecommendationsStrip currentEvent={event} />

      </div>

      {/* Payment Modal */}
      {event && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          eventId={event._id}
          eventTitle={event.title}
          amount={event.feeAmount}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

function RecommendationsStrip({ currentEvent }: { currentEvent: EventData }) {
  const [recommendations, setRecommendations] = useState<EventData[]>([]);

  useEffect(() => {
    fetch(`/api/events?category=${encodeURIComponent(currentEvent.category)}`)
      .then(r => r.json())
      .then((data: EventData[]) => {
        const recs = data.filter(e => e._id !== currentEvent._id).slice(0, 3);
        setRecommendations(recs);
      })
      .catch(() => {});
  }, [currentEvent._id, currentEvent.category]);

  if (recommendations.length === 0) return null;

  return (
    <div style={{ marginTop: 64, borderTop: '1px solid var(--border)', paddingTop: 40 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>You might also like...</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
        {recommendations.map(event => (
          <Link href={`/events/${event._id}`} key={event._id} className="card" style={{ display: 'block', textDecoration: 'none', transition: 'transform 0.2s', padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 160, background: event.imageUrl ? `url(${event.imageUrl}) center/cover` : 'var(--surface2)', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
               <span className={`badge cat-${event.category}`} style={{ fontSize: 11 }}>{event.category}</span>
            </div>
            <div style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>{event.title}</h3>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {format(new Date(event.date), 'MMM d, yyyy')} • {event.venue}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
