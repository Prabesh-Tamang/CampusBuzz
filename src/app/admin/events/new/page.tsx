'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const categories = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Hackathon', 'Other']

export default function NewEventPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Technical',
    date: '',
    endDate: '',
    venue: '',
    capacity: 100,
    registrationDeadline: '',
    tags: '',
    image: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          capacity: Number(form.capacity),
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Event created successfully! 🎉')
      router.push('/admin')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, children }: any) => (
    <div>
      <label className="block text-sm text-gray-400 mb-2 font-medium">{label}</label>
      {children}
    </div>
  )

  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm mb-6 transition-colors">
            ← Back to Dashboard
          </button>
          <h1 className="font-display font-extrabold text-4xl mb-8">
            Create <span className="gradient-text">Event</span>
          </h1>

          <form onSubmit={handleSubmit} className="gradient-border p-8 space-y-6">
            <Field label="Event Title *">
              <input type="text" placeholder="e.g. Annual Tech Fest 2024"
                value={form.title} onChange={e => set('title', e.target.value)} required />
            </Field>

            <Field label="Description *">
              <textarea rows={4} placeholder="Describe your event..."
                value={form.description} onChange={e => set('description', e.target.value)} required />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category *">
                <select value={form.category} onChange={e => set('category', e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Capacity *">
                <input type="number" min="1" value={form.capacity}
                  onChange={e => set('capacity', e.target.value)} required />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Event Date & Time *">
                <input type="datetime-local" value={form.date}
                  onChange={e => set('date', e.target.value)} required />
              </Field>
              <Field label="End Date & Time">
                <input type="datetime-local" value={form.endDate}
                  onChange={e => set('endDate', e.target.value)} />
              </Field>
            </div>

            <Field label="Registration Deadline *">
              <input type="datetime-local" value={form.registrationDeadline}
                onChange={e => set('registrationDeadline', e.target.value)} required />
            </Field>

            <Field label="Venue *">
              <input type="text" placeholder="e.g. Main Auditorium, Block A"
                value={form.venue} onChange={e => set('venue', e.target.value)} required />
            </Field>

            <Field label="Tags (comma separated)">
              <input type="text" placeholder="e.g. coding, prizes, networking"
                value={form.tags} onChange={e => set('tags', e.target.value)} />
            </Field>

            <Field label="Event Image URL (optional)">
              <input type="url" placeholder="https://..."
                value={form.image} onChange={e => set('image', e.target.value)} />
            </Field>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => router.back()}
                className="flex-1 py-3 glass hover:bg-white/10 text-white rounded-xl font-semibold transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-2 flex-1 py-3 bg-pulse-600 hover:bg-pulse-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                {loading ? 'Creating...' : '🚀 Create Event'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
