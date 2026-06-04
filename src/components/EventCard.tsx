'use client'
import { memo } from 'react'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { HiCalendar, HiLocationMarker, HiUserGroup } from 'react-icons/hi'
import { Share2 } from 'lucide-react'
import { CATEGORY_COLORS } from '@/lib/constants'

interface EventCardProps {
  event: any
  index?: number
}

function EventCard({ event, index = 0 }: EventCardProps) {
  const spotsLeft = event.capacity - event.registeredCount
  const isFull = spotsLeft <= 0
  const fillPercent = Math.min((event.registeredCount / event.capacity) * 100, 100)
  const [copied, setCopied] = useState(false)
  const catColor = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.Other

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/events/${event._id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      // silent
    }
  }

  const now = new Date()
  const isEnded = new Date(event.date) < now

  // Gradient background used when no imageUrl
  const catBg =
    event.category === 'Technical'  ? '#14b8a6, #0d9488' :
    event.category === 'Cultural'   ? '#f43f5e, #e11d48' :
    event.category === 'Sports'     ? '#f59e0b, #d97706' :
    event.category === 'Workshop'   ? '#a78bfa, #7c3aed' :
    event.category === 'Seminar'    ? '#fb923c, #ea580c' :
    event.category === 'Hackathon'  ? '#ec4899, #db2777' :
                                      '#60a5fa, #2563eb'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden
                 hover:border-teal-500/30 hover:bg-white/[0.05] transition-all
                 duration-200 group cursor-pointer flex flex-col h-full"
    >
      <Link href={`/events/${event._id}`} className="flex flex-col flex-1">
        {/* Image / gradient header — always same height, badges always overlaid */}
        <div className="relative h-40 flex-shrink-0 overflow-hidden">
          {event.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500
                         group-hover:scale-105"
              onError={(e) => {
                const wrapper = (e.target as HTMLImageElement).closest('.img-wrapper') as HTMLElement | null
                if (wrapper) wrapper.style.background = `linear-gradient(135deg, ${catBg})`
              }}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${catBg})` }}
            />
          )}

          {/* Always-visible badge row overlaid on image/gradient */}
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3 flex items-end justify-between gap-2
                          bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-8">
            <div className="flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs
                               font-semibold backdrop-blur-sm
                               ${catColor.bg} ${catColor.text} ${catColor.border} border`}>
                {event.category}
              </span>
              {event.feeType === 'paid' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                                 font-semibold bg-amber-500/25 text-amber-300
                                 border border-amber-500/30 backdrop-blur-sm">
                  Rs.&nbsp;{event.feeAmount.toLocaleString()}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                                 font-semibold bg-teal-500/25 text-teal-300
                                 border border-teal-500/30 backdrop-blur-sm">
                  Free
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {isFull && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                                 font-semibold bg-red-500/25 text-red-300
                                 border border-red-500/30 backdrop-blur-sm">
                  Full
                </span>
              )}
              {isEnded && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                                 font-semibold bg-gray-500/25 text-gray-300
                                 border border-gray-500/30 backdrop-blur-sm">
                  Ended
                </span>
              )}
              {event.isCancelled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                                 font-semibold bg-red-500/25 text-red-300
                                 border border-red-500/30 backdrop-blur-sm">
                  Cancelled
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1">
          {/* Title + share */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-[17px] leading-snug text-white
                           group-hover:text-teal-300 transition-colors line-clamp-2 flex-1">
              {event.title}
            </h3>
            <button
              onClick={handleShare}
              className="flex-shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10
                         text-gray-500 hover:text-white transition-colors mt-0.5"
              title={copied ? 'Link copied!' : 'Share event'}
            >
              {copied
                ? <span className="text-teal-400 text-xs px-0.5">✓</span>
                : <Share2 size={13} />
              }
            </button>
          </div>

          <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1">{event.description}</p>

          {/* Meta info */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiCalendar className="text-teal-400 flex-shrink-0" />
              <span className="truncate">{format(new Date(event.date), 'EEE, MMM d · h:mm a')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiLocationMarker className="text-teal-400 flex-shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiUserGroup className="text-teal-400 flex-shrink-0" />
              <span>{isFull ? 'No spots left' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}</span>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{event.registeredCount} registered</span>
              <span>{event.capacity} capacity</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  fillPercent > 80 ? 'bg-red-500' : fillPercent > 50 ? 'bg-yellow-500' : 'bg-teal-500'
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className={`text-center py-2.5 rounded-xl text-sm font-semibold transition-all mt-auto ${
            isFull
              ? 'bg-white/5 text-gray-500 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-500 text-white'
          }`}>
            {isFull ? 'Event Full' : 'View & Register →'}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default memo(EventCard);
