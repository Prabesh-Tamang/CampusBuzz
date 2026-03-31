'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventTitle: string
  amount: number
  onSuccess: () => void
}

export default function PaymentModal({ isOpen, onClose, eventId, eventTitle, amount, onSuccess }: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'khalti' | 'esewa' | null>(null)
  const [error, setError] = useState('')

  const handlePayment = async (provider: 'khalti' | 'esewa') => {
    setLoading(true)
    setError('')
    setSelectedProvider(provider)

    try {
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, provider }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (provider === 'khalti') {
        // Khalti v2 e-payment: server initiates and returns a hosted payment_url.
        // Redirect user to Khalti's page where they log in and enter MPIN.
        // After payment, Khalti redirects back to /api/payment/khalti/callback
        const paymentUrl = data.khaltiConfig?.additionalData?.payment_url
        if (!paymentUrl) throw new Error('Failed to get Khalti payment URL')
        window.location.href = paymentUrl

      } else if (provider === 'esewa') {
        // eSewa v2: POST form submission.
        // transaction_uuid = purchaseOrderId (server generated, signature already computed)
        const config = data.esewaConfig
        const transactionUuid = data.productIdentity // purchaseOrderId

        const form = document.createElement('form')
        form.method = 'POST'
        form.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'

        const fields: Record<string, string> = {
          amount: String(config.amount),
          tax_amount: '0',
          total_amount: String(config.totalAmount),
          transaction_uuid: transactionUuid,
          product_code: config.merchantId || 'EPAYTEST',
          product_service_charge: '0',
          product_delivery_charge: '0',
          success_url: config.merchantCallbackUrl,
          failure_url: `${window.location.origin}/payment/failed`,
          signed_field_names: 'total_amount,transaction_uuid,product_code',
          signature: data.signature || '',
        }

        Object.entries(fields).forEach(([key, value]) => {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = value
          form.appendChild(input)
        })

        document.body.appendChild(form)
        form.submit()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment')
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-dark-card border border-border rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Complete Payment</h2>
              <button
                onClick={onClose}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-border rounded-lg transition-all disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 p-4 bg-dark-border/50 rounded-xl">
              <p className="text-gray-400 text-sm">Event</p>
              <p className="text-white font-medium">{eventTitle}</p>
              <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                <span className="text-gray-400">Total Amount</span>
                <span className="text-2xl font-bold text-white">Rs. {amount}</span>
              </div>
            </div>

            {loading && (
              <div className="mb-4 p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400 text-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Redirecting to {selectedProvider === 'khalti' ? 'Khalti' : 'eSewa'} payment page...
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {!loading && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-3">Select Payment Method</p>

                <button
                  onClick={() => handlePayment('khalti')}
                  disabled={loading}
                  className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-xl flex items-center gap-4 transition-all"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">K</span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-white font-semibold">Khalti</p>
                    <p className="text-white/60 text-sm">Login with Khalti wallet</p>
                  </div>
                </button>

                <button
                  onClick={() => handlePayment('esewa')}
                  disabled={loading}
                  className="w-full p-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:opacity-50 rounded-xl flex items-center gap-4 transition-all"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">eS</span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-white font-semibold">eSewa</p>
                    <p className="text-white/60 text-sm">Login with eSewa wallet</p>
                  </div>
                </button>
              </div>
            )}

            <p className="mt-6 text-center text-gray-500 text-xs">
              You will be redirected to the payment gateway to complete your payment securely.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
