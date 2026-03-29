'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { CreditCard, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded'

const statusConfig: Record<PaymentStatus, { color: string; icon: typeof CheckCircle }> = {
  completed: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  pending: { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  failed: { color: 'bg-red-500/20 text-red-400', icon: XCircle },
  refunded: { color: 'bg-gray-500/20 text-gray-400', icon: XCircle },
}

export default function PaymentHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return }
    if (status === 'authenticated') {
      fetchPayments()
    }
  }, [status])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payment/history')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-pulse-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-3xl">
                Payment <span className="gradient-text">History</span>
              </h1>
              <p className="text-gray-400 text-sm">Your transaction history</p>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-dark-border mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No payments yet</h3>
              <p className="text-gray-400 mb-6">You haven't made any payments for paid events.</p>
              <Link href="/events" className="btn-primary inline-flex items-center gap-2">
                Browse Events <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment: any) => {
                const paymentStatus = payment.status as PaymentStatus
                const config = statusConfig[paymentStatus] || statusConfig.pending
                const StatusIcon = config.icon

                return (
                  <motion.div
                    key={payment._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-5 hover:bg-dark-border/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          payment.provider === 'khalti' 
                            ? 'bg-gradient-to-br from-purple-600 to-pink-600' 
                            : 'bg-gradient-to-br from-green-600 to-teal-600'
                        }`}>
                          <span className="text-white font-bold text-sm">
                            {payment.provider === 'khalti' ? 'K' : 'eS'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">
                            {payment.eventId?.title || 'Event'}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {format(new Date(payment.createdAt), 'MMM d, yyyy')} at{' '}
                            {format(new Date(payment.createdAt), 'h:mm a')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Order ID: {payment.purchaseOrderId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">
                          Rs. {payment.amount}
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mt-2 ${config.color}`}>
                          <StatusIcon size={12} />
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </div>
                      </div>
                    </div>
                    {payment.transactionId && (
                      <div className="mt-3 pt-3 border-t border-border text-xs text-gray-500">
                        Transaction ID: {payment.transactionId}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
