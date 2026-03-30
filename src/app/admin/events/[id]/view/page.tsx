"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  Building,
  DollarSign,
  Tag,
  Edit2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

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
  feeType: 'free' | 'paid';
  feeAmount: number;
  isActive: boolean;
  registrationDeadline?: string;
  createdAt: string;
}

export default function AdminEventViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/events');
      return;
    }
    
    if (status === 'authenticated') {
      fetch(`/api/events/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setEvent(data);
          setLoading(false);
        });
    }
  }, [id, session, status]);

  if (loading || status === 'loading')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!event)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Event not found</p>
          <Link href="/admin/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );

  const spotsLeft = event.capacity - event.registeredCount;
  const fillRate = Math.round((event.registeredCount / event.capacity) * 100);
  const isEnded = new Date(event.date) < new Date();

  return (
    <div className="min-h-screen">
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/dashboard" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition mb-4 text-sm"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`badge cat-${event.category}`}>
                  {event.category}
                </span>
                {event.feeType === 'paid' ? (
                  <span className="badge bg-amber-500/20 text-amber-400">
                    <DollarSign size={12} /> Rs. {event.feeAmount}
                  </span>
                ) : (
                  <span className="badge bg-green-500/20 text-green-400">Free</span>
                )}
                {isEnded && (
                  <span className="badge bg-gray-500/20 text-gray-400">Ended</span>
                )}
                {!event.isActive && (
                  <span className="badge bg-red-500/20 text-red-400">Hidden</span>
                )}
              </div>
              <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-tighter text-white">
                {event.title}
              </h1>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/events/${event._id}/edit`}
                className="btn-ghost flex items-center gap-2"
              >
                <Edit2 size={16} /> Edit
              </Link>
              <Link
                href={`/events/${event._id}`}
                target="_blank"
                className="btn-ghost flex items-center gap-2"
              >
                <Eye size={16} /> View Public
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calendar size={14} /> Date
            </div>
            <p className="text-lg font-bold text-white">
              {format(new Date(event.date), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(event.date), 'h:mm a')}
              {event.endDate && ` - ${format(new Date(event.endDate), 'h:mm a')}`}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <MapPin size={14} /> Venue
            </div>
            <p className="text-lg font-bold text-white">{event.venue}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users size={14} /> Registrations
            </div>
            <p className="text-lg font-bold text-white">
              {event.registeredCount}/{event.capacity}
            </p>
            <div className="mt-2 w-full h-2 bg-surface2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  fillRate >= 100 ? 'bg-red-500' : fillRate >= 80 ? 'bg-amber-500' : 'bg-teal-500'
                }`}
                style={{ width: `${fillRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{fillRate}% filled</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock size={14} /> Spots Left
            </div>
            <p className={`text-lg font-bold ${spotsLeft <= 10 ? 'text-amber-400' : 'text-white'}`}>
              {spotsLeft > 0 ? spotsLeft : 'FULL'}
            </p>
            {event.registrationDeadline && (
              <p className="text-xs text-muted-foreground mt-1">
                Closes: {format(new Date(event.registrationDeadline), 'MMM d')}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner */}
            <div
              className="h-64 rounded-2xl overflow-hidden relative"
              style={{
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
              }}
            >
              {!event.imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <Calendar size={80} className="text-white" />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Tag size={18} /> Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-sm text-muted-foreground font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Organizer */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Building size={18} /> Organizer
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-lg font-bold text-teal-950">
                  {event.organizer?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-white">{event.organizer || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">Event Organizer</p>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-semibold ${
                    !event.isActive ? 'text-red-400' : 
                    isEnded ? 'text-gray-400' : 'text-green-400'
                  }`}>
                    {!event.isActive ? 'Hidden' : isEnded ? 'Ended' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span className={`font-semibold ${
                    event.feeType === 'paid' ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {event.feeType === 'paid' ? `Rs. ${event.feeAmount}` : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-semibold text-white">{event.category}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-sm text-gray-400">
                    {event.createdAt ? format(new Date(event.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/admin/events/${event._id}/edit`}
                  className="btn-ghost w-full justify-start"
                >
                  <Edit2 size={16} /> Edit Event
                </Link>
                <Link
                  href={`/events/${event._id}`}
                  target="_blank"
                  className="btn-ghost w-full justify-start"
                >
                  <Eye size={16} /> View Public Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
