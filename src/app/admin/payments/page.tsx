'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCcw, 
  Filter,
  Download,
  DollarSign
} from 'lucide-react'

type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded'

const statusConfig: Record<PaymentStatus, { color: string; bgColor: string; icon: typeof CheckCircle }> = {
  completed: { color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle },
  pending: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: Clock },
  failed: { color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
  refunded: { color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: RefreshCcw },
}

export default function AdminPaymentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [byProvider, setByProvider] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return }
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/'); return
    }
    if (status === 'authenticated') {
      fetchPayments()
    }
  }, [status, session])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments')
      const data = await res.json()
      setPayments(data.payments || [])
      setStats(data.stats)
      setByProvider(data.byProvider)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (paymentId: string) => {
    try {
      const res = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      })
      if (res.ok) {
        fetchPayments()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filteredPayments = payments.filter((p: any) => {
    if (filter !== 'all' && p.status !== filter) return false
    if (providerFilter !== 'all' && p.provider !== providerFilter) return false
    return true
  })

  if (loading) return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-pulse-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen">
      <div className="pb-16 px-4 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-3xl">
                Payment <span className="gradient-text">Reports</span>
              </h1>
              <p className="text-gray-400 text-sm">Monitor all transactions and refunds</p>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">Rs. {stats.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Completed</p>
                    <p className="text-2xl font-bold text-white">{stats.completed}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-bold text-white">{stats.pending}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Refunded</p>
                    <p className="text-2xl font-bold text-white">{stats.refunded}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provider Breakdown */}
          {byProvider && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">eSewa</p>
                    <p className="text-xl font-bold text-white">Rs. {byProvider.esewa.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{byProvider.esewa.count} transactions</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                    <span className="text-green-400 font-bold text-lg">e</span>
                  </div>
                </div>
              </div>
              
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Khalti</p>
                    <p className="text-xl font-bold text-white">Rs. {byProvider.khalti.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{byProvider.khalti.count} transactions</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-lg">K</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Status:</span>
              <select 
                value={filter} 
                onChange={e => setFilter(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pulse-500"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Provider:</span>
              <select 
                value={providerFilter} 
                onChange={e => setProviderFilter(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pulse-500"
              >
                <option value="all">All</option>
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
              </select>
            </div>
          </div>

          {/* Payments Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Provider</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No payments found
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment: any, index: number) => {
                      const config = statusConfig[payment.status as PaymentStatus] || statusConfig.pending
                      const StatusIcon = config.icon
                      
                      return (
                        <motion.tr 
                          key={payment._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-border/50 hover:bg-dark-border/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {payment.userId?.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payment.userId?.email || 'No email'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-white">
                              {payment.eventId?.title || 'Unknown Event'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              payment.provider === 'khalti' 
                                ? 'bg-purple-500/20 text-purple-400' 
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {payment.provider === 'khalti' ? 'Khalti' : 'eSewa'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-white">
                              Rs. {payment.amount.toLocaleString()}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.color}`}>
                              <StatusIcon size={12} />
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-400">
                              {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(payment.createdAt), 'h:mm a')}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            {payment.status === 'completed' && (
                              <button
                                onClick={() => handleRefund(payment._id)}
                                className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                              >
                                Refund
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
