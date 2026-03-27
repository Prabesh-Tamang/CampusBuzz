'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Calendar, Users, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Event {
  _id: string; title: string; category: string; date: string; venue: string;
  capacity: number; registeredCount: number; isActive: boolean;
}

const emptyForm = {
  title: '', description: '', category: 'Technical', date: '', endDate: '',
  venue: '', capacity: 100, organizer: '', imageUrl: '', tags: '',
};

export default function ManageEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'authenticated') {
      const isAdmin = (session?.user as { role?: string })?.role === 'admin';
      if (!isAdmin) { router.push('/events'); return; }
      fetchEvents();
    }
  }, [status]);

  async function fetchEvents() {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), capacity: Number(form.capacity) };
      const url = editId ? `/api/events/${editId}` : '/api/events';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed');
      toast.success(editId ? 'Event updated!' : 'Event created!');
      setShowForm(false); setForm(emptyForm); setEditId(null);
      fetchEvents();
    } catch { toast.error('Something went wrong'); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    toast.success('Event deleted');
    fetchEvents();
  }

  function handleEdit(event: Event & { description?: string; organizer?: string; imageUrl?: string; tags?: string[]; endDate?: string }) {
    setForm({
      title: event.title, description: (event as { description?: string }).description || '',
      category: event.category, date: event.date?.slice(0, 16) || '',
      endDate: event.endDate?.slice(0, 16) || '', venue: event.venue,
      capacity: event.capacity, organizer: event.organizer || '',
      imageUrl: event.imageUrl || '', tags: event.tags?.join(', ') || '',
    });
    setEditId(event._id);
    setShowForm(true);
  }

  const categories = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'];

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', textDecoration: 'none' }}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Manage Events</h1>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 14 }}>Create and manage campus events</p>
            </div>
          </div>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>
            <Plus size={18} /> New Event
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card" style={{ padding: 32, marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 24px' }}>{editId ? 'Edit Event' : 'Create New Event'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Event Title *</label>
                <input className="input" placeholder="Hackathon 2025" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description *</label>
                <textarea className="input" placeholder="Tell students about this event..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={4} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</label>
                <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ cursor: 'pointer' }}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Organizer *</label>
                <input className="input" placeholder="CSE Department" value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Start Date & Time *</label>
                <input className="input" type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>End Date & Time *</label>
                <input className="input" type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Venue *</label>
                <input className="input" placeholder="Main Auditorium" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capacity</label>
                <input className="input" type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Image URL (optional)</label>
                <input className="input" placeholder="https://..." value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tags (comma separated)</label>
                <input className="input" placeholder="coding, hackathon, prizes" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Saving...' : editId ? 'Update Event' : 'Create Event'}
                </button>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => { setShowForm(false); setEditId(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Events Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 16 }}>
            All Events ({events.length})
          </div>
          {events.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No events yet. Create your first one!
            </div>
          ) : (
            events.map((event, i) => (
              <div key={event._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px',
                borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  <div style={{ width: 44, height: 44, background: 'var(--surface2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={20} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{event.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                      <span>{format(new Date(event.date), 'MMM d, yyyy')}</span>
                      <span>·</span>
                      <span>{event.venue}</span>
                      <span>·</span>
                      <span className={`badge cat-${event.category}`}>{event.category}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>{event.registeredCount}/{event.capacity}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>registered</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleEdit(event as unknown as Event & { description?: string; organizer?: string; imageUrl?: string; tags?: string[]; endDate?: string })} style={{ padding: '8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', display: 'flex' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.color = '#60a5fa'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(event._id)} style={{ padding: '8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', display: 'flex' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#f43f5e'; e.currentTarget.style.color = '#f43f5e'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
