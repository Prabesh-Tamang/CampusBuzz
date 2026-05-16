'use client'
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

export default function EventCard({ event, index = 0 }: EventCardProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden
                 hover:border-teal-500/30 hover:bg-white/[0.05] transition-all
                 duration-200 group cursor-pointer"
    >
      <Link href={`/events/${event._id}`}>
        {/* Event image */}
        {event.imageUrl && (
          <div className="h-40 overflow-hidden rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500
                         group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.style.display = 'none'
              }}
            />
          </div>
        )}

        <div className="p-5">
          {/* Category & Badges */}
          <div className="flex items-center justify-between mb-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs
                             font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
              {event.category}
            </span>
            <div className="flex items-center gap-2">
              {isFull && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                                 font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  Full
                </span>
              )}
              {isEnded && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                                 font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                  Ended
                </span>
              )}
              {event.isCancelled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                                 font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  Cancelled
                </span>
              )}
              <button
                onClick={handleShare}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                title={copied ? 'Link copied!' : 'Share event'}
              >
                {copied
                  ? <span className="text-teal-400 text-xs px-0.5">✓</span>
                  : <Share2 size={13} />
                }
              </button>
            </div>
          </div>

          {/* Price badge */}
          {event.feeType === 'paid' ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                             font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Rs. {event.feeAmount.toLocaleString()}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                             font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3">
              Free
            </span>
          )}

          {/* Title */}
          <h3 className="font-display font-bold text-xl text-white mb-1 group-hover:text-teal-300 transition-colors line-clamp-2 mt-2">
            {event.title}
          </h3>

          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>

          {/* Meta info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiCalendar className="text-teal-400 flex-shrink-0" />
              <span>{format(new Date(event.date), 'EEE, MMM d · h:mm a')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiLocationMarker className="text-teal-400 flex-shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiUserGroup className="text-teal-400 flex-shrink-0" />
              <span>{isFull ? 'No spots left' : `${spotsLeft} spots left`}</span>
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
          <div className={`text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isFull
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-500 text-white'
          }`}>
            {isFull ? 'Event Full' : 'View & Register →'}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
