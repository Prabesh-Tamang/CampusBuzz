'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, Loader2 } from 'lucide-react'

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

      if (provider === 'khalti' && data.khaltiConfig) {
        const config = data.khaltiConfig
        
        if (typeof window !== 'undefined' && (window as any).Khalti) {
          (window as any).Khalti.init({
            publicKey: config.publicKey,
            productIdentity: config.productIdentity,
            productName: config.productName,
            productUrl: config.productUrl,
            amount: config.amount,
            mobile: '',
            productDetails: config.productDetails,
            paymentPreference: [
              'KHALTI',
              'MOBILE_BANKING',
              'CONNECT_IPS',
              'SCT',
            ],
            eventListener: async (event: any) => {
              if (event.action === 'SUCCESS') {
                setLoading(true)
                try {
                  const verifyRes = await fetch('/api/payment/khalti/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      paymentId: data.paymentId,
                      pidx: event.pidx,
                      transactionId: event.token,
                      amount: config.amount,
                      userId: (window as any).__userId__,
                      eventId,
                    }),
                  })
                  
                  const verifyData = await verifyRes.json()
                  if (verifyData.success) {
                    onSuccess()
                  } else {
                    setError('Payment verification failed')
                  }
                } catch {
                  setError('Payment verification failed')
                } finally {
                  setLoading(false)
                }
              } else if (event.action === 'CANCEL') {
                setError('Payment cancelled')
              }
            },
          })
          
          (window as any).Khalti.enablePayment()
        } else {
          const script = document.createElement('script')
          script.src = 'https://developer.khalti.com/static/khalti-checkout.js'
          script.onload = () => {
            (window as any).Khalti.init({
              publicKey: config.publicKey,
              productIdentity: config.productIdentity,
              productName: config.productName,
              productUrl: config.productUrl,
              amount: config.amount,
              mobile: '',
              productDetails: config.productDetails,
              paymentPreference: [
                'KHALTI',
                'MOBILE_BANKING',
                'CONNECT_IPS',
                'SCT',
              ],
              eventListener: async (event: any) => {
                if (event.action === 'SUCCESS') {
                  setLoading(true)
                  try {
                    const verifyRes = await fetch('/api/payment/khalti/verify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        paymentId: data.paymentId,
                        pidx: event.pidx,
                        transactionId: event.token,
                        amount: config.amount,
                        userId: (window as any).__userId__,
                        eventId,
                      }),
                    })
                    
                    const verifyData = await verifyRes.json()
                    if (verifyData.success) {
                      onSuccess()
                    } else {
                      setError('Payment verification failed')
                    }
                  } catch {
                    setError('Payment verification failed')
                  } finally {
                    setLoading(false)
                  }
                } else if (event.action === 'CANCEL') {
                  setError('Payment cancelled')
                }
              },
            })
            (window as any).Khalti.enablePayment()
          }
          document.body.appendChild(script)
        }
      } else if (provider === 'esewa' && data.esewaConfig) {
        const config = data.esewaConfig
        
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = 'https://uat.esewa.com.np/epay/main'
        
        const fields: Record<string, string> = {
          amt: String(config.amount),
          txAmt: String(config.taxAmount),
          psc: '0',
          totalAmt: String(config.totalAmount),
          pid: config.productIdentity,
          tUid: config.merchantId,
          surl: config.merchantCallbackUrl,
          furl: `${window.location.origin}/events?payment=failed`,
        }
        
        if (data.signature) {
          fields['signature'] = data.signature
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
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-dark-card border border-border rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Complete Payment</h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-dark-border rounded-lg transition-all">
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

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-3">Select Payment Method</p>
              
              <button
                onClick={() => handlePayment('khalti')}
                disabled={loading}
                className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-xl flex items-center gap-4 transition-all"
              >
                {loading && selectedProvider === 'khalti' ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">K</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white font-semibold">Khalti</p>
                  <p className="text-white/60 text-sm">Pay with Khalti Wallet</p>
                </div>
              </button>

              <button
                onClick={() => handlePayment('esewa')}
                disabled={loading}
                className="w-full p-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:opacity-50 rounded-xl flex items-center gap-4 transition-all"
              >
                {loading && selectedProvider === 'esewa' ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">eS</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white font-semibold">eSewa</p>
                  <p className="text-white/60 text-sm">Pay with eSewa Wallet</p>
                </div>
              </button>
            </div>

            <p className="mt-6 text-center text-gray-500 text-xs">
              Payment is secured by Khalti and eSewa
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
