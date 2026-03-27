'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { HiCalendar, HiLocationMarker, HiUserGroup, HiClock } from 'react-icons/hi'

const categoryColors: Record<string, string> = {
  Technical: 'bg-blue-500/20 text-blue-300',
  Cultural: 'bg-purple-500/20 text-purple-300',
  Sports: 'bg-green-500/20 text-green-300',
  Workshop: 'bg-yellow-500/20 text-yellow-300',
  Seminar: 'bg-orange-500/20 text-orange-300',
  Hackathon: 'bg-pink-500/20 text-pink-300',
  Other: 'bg-gray-500/20 text-gray-300',
}

interface EventCardProps {
  event: any
  index?: number
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
  const spotsLeft = event.capacity - event.registeredCount
  const isFull = spotsLeft <= 0
  const fillPercent = Math.min((event.registeredCount / event.capacity) * 100, 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="gradient-border overflow-hidden group cursor-pointer"
    >
      <Link href={`/events/${event._id}`}>
        {/* Top color bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r from-pulse-500 to-pulse-700`} />

        <div className="p-6">
          {/* Category & Status */}
          <div className="flex items-center justify-between mb-4">
            <span className={`badge ${categoryColors[event.category] || categoryColors.Other}`}>
              {event.category}
            </span>
            {isFull && (
              <span className="badge bg-red-500/20 text-red-400">Full</span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-display font-bold text-xl text-white mb-1 group-hover:text-pulse-300 transition-colors line-clamp-2">
            {event.title}
          </h3>

          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>

          {/* Meta info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiCalendar className="text-pulse-400 flex-shrink-0" />
              <span>{format(new Date(event.date), 'EEE, MMM d · h:mm a')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiLocationMarker className="text-pulse-400 flex-shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <HiUserGroup className="text-pulse-400 flex-shrink-0" />
              <span>{isFull ? 'No spots left' : `${spotsLeft} spots left`}</span>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{event.registeredCount} registered</span>
              <span>{event.capacity} capacity</span>
            </div>
            <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  fillPercent > 80 ? 'bg-red-500' : fillPercent > 50 ? 'bg-yellow-500' : 'bg-pulse-500'
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className={`text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isFull
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-pulse-600 hover:bg-pulse-500 text-white group-hover:glow-blue'
          }`}>
            {isFull ? 'Event Full' : 'View & Register →'}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
